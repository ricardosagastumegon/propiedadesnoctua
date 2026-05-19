"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { maintenanceSchema } from "@/lib/schemas/maintenance"
import { logActivity } from "@/lib/activity-log"
import { canMakePayment } from "@/lib/service-acceptance"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getSession() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user!.id!,
    orgId: (session.user as any).organizationId as string,
    authorityPolicy: (session.user as any).authorityPolicy as string | undefined,
    actorName: session.user!.name ?? "Usuario",
  }
}

async function nextTicketNumber(orgId: string) {
  const count = await prisma.maintenanceRequest.count({ where: { organizationId: orgId } })
  return `M-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`
}

async function addTimeline(ticketId: string, type: string, message: string, metadata?: string) {
  await prisma.maintenanceTimelineEvent.create({ data: { ticketId, type, message, metadata } })
}

export async function createTicket(formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const raw = Object.fromEntries(formData)
  const parsed = maintenanceSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const ticketNumber = await nextTicketNumber(orgId)
  const ticket = await prisma.maintenanceRequest.create({
    data: {
      organizationId: orgId,
      ticketNumber,
      ...parsed.data,
      assetId: parsed.data.assetId || null,
      reportedBy: parsed.data.reportedBy || null,
      reportedPhone: parsed.data.reportedPhone || null,
      estimatedCost: parsed.data.estimatedCost ?? null,
    },
  })
  await addTimeline(ticket.id, "STATUS_CHANGE", `Ticket creado — ${ticket.title}`)
  await logActivity({ orgId, entityType: "TICKET", entityId: ticket.id, action: "CREATED", actorId: userId, actorName, metadata: { ticketNumber, title: ticket.title } })
  revalidatePath("/mantenimiento")
  return { redirectTo: `/mantenimiento/${ticket.id}` }
}

export async function updateTicketStatus(id: string, status: string, assigneeId?: string) {
  const { orgId, userId, actorName } = await getSession()
  const now = new Date()
  await prisma.maintenanceRequest.updateMany({
    where: { id, organizationId: orgId },
    data: {
      status,
      ...(status === "IN_PROGRESS" ? { startedAt: now } : {}),
      ...(status === "COMPLETED" ? { completedAt: now } : {}),
      ...(status === "ASSIGNED" ? { assignedAt: now, ...(assigneeId ? { assignedToId: assigneeId } : {}) } : {}),
    },
  })
  await addTimeline(id, "STATUS_CHANGE", `Estado cambiado a: ${status}`)
  await logActivity({ orgId, entityType: "TICKET", entityId: id, action: "STATUS_CHANGED", actorId: userId, actorName, metadata: { status, assigneeId } })
  revalidatePath(`/mantenimiento/${id}`)
  revalidatePath("/mantenimiento")
}

export async function updateTicketCost(id: string, actualCost: number, resolutionNotes: string) {
  const { orgId } = await getSession()
  await prisma.maintenanceRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { actualCost, resolutionNotes },
  })
  await addTimeline(id, "NOTE", `Costo actualizado: Q${actualCost.toFixed(2)}`)
  revalidatePath(`/mantenimiento/${id}`)
}

export async function setPaymentMode(id: string, paymentMode: string, vendorId?: string) {
  const { orgId } = await getSession()
  await prisma.maintenanceRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { paymentMode, vendorId: vendorId || null },
  })
  await addTimeline(id, "NOTE", `Modo de pago: ${paymentMode}${vendorId ? " (con proveedor)" : ""}`)
  revalidatePath(`/mantenimiento/${id}`)
}

export async function addTicketQuote(ticketId: string, formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")

  const vendorId = formData.get("vendorId") as string
  const amount = parseFloat(formData.get("amount") as string) || 0
  const notes = formData.get("notes") as string || null

  if (!vendorId || !amount) return { error: "Proveedor y monto requeridos" }

  await prisma.ticketQuote.create({ data: { ticketId, vendorId, amount, notes } })
  await addTimeline(ticketId, "QUOTE_ADDED", `Cotizacion agregada: Q${amount.toFixed(2)}`)
  await logActivity({ orgId, entityType: "TICKET", entityId: ticketId, action: "QUOTE_ADDED", actorId: userId, actorName, metadata: { amount, vendorId } })
  revalidatePath(`/mantenimiento/${ticketId}`)
}

import { TICKET_AUTH_THRESHOLD, TICKET_PROJECT_THRESHOLD } from "./constants"

export async function finalizeTicketSelection(ticketId: string, selectedIds: string[]) {
  const { orgId, authorityPolicy, userId, actorName } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")
  if (!selectedIds.length) return { error: "Selecciona al menos una cotización" }

  const selected = await prisma.ticketQuote.findMany({
    where: { id: { in: selectedIds }, ticketId },
    include: { vendor: { select: { name: true } } },
  })
  if (selected.length !== selectedIds.length) return { error: "Cotizaciones inválidas" }

  const total = selected.reduce((s, q) => s + q.amount, 0)
  const vendorNames = selected.map(q => q.vendor.name).join(", ")
  const primaryVendorId = selected.length === 1 ? selected[0].vendorId : null

  // >Q4,000 total → must convert to project
  if (total >= TICKET_PROJECT_THRESHOLD) {
    return { error: `El total (Q${total.toFixed(2)}) supera Q${TICKET_PROJECT_THRESHOLD.toLocaleString()}. Debe convertir a proyecto.` }
  }

  // Q1,000–Q4,000 total → requires authorization
  if (total >= TICKET_AUTH_THRESHOLD) {
    if (!authorityPolicy || authorityPolicy === "NONE") return { error: "Sin autoridad para solicitar aprobación" }
    if (ticket.approvalRequestId) return { requiresApproval: true }
    const status = authorityPolicy === "ALONE" ? "PENDING" : "PENDING_COSIGN"
    const approvalReq = await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        requestedById: userId,
        entityType: "TICKET",
        entityId: ticketId,
        title: `Aprobar mantenimiento ${ticket.ticketNumber}: ${vendorNames}`,
        amount: total,
        notes: `Total requiere autorización (≥ Q${TICKET_AUTH_THRESHOLD.toLocaleString()})`,
        status,
      },
    })
    await prisma.$transaction(async (tx) => {
      await tx.ticketQuote.updateMany({ where: { ticketId }, data: { status: "REJECTED" } })
      await tx.ticketQuote.updateMany({ where: { id: { in: selectedIds } }, data: { status: "SELECTED" } })
      await tx.maintenanceRequest.update({
        where: { id: ticketId },
        data: { totalAmount: total, approvalRequestId: approvalReq.id, vendorId: primaryVendorId },
      })
    })
    await addTimeline(ticketId, "NOTE", `Cotizaciones enviadas a autorización: ${vendorNames} — Total Q${total.toFixed(2)}`)
    await logActivity({ orgId, entityType: "TICKET", entityId: ticketId, action: "APPROVAL_REQUESTED", actorId: userId, actorName, metadata: { vendors: vendorNames, amount: total } })
    revalidatePath("/autorizaciones")
    revalidatePath(`/mantenimiento/${ticketId}`)
    return { requiresApproval: true }
  }

  // <Q1,000 total → direct, no authorization needed
  if (authorityPolicy === "ALONE" || authorityPolicy === "COSIGN_REQUIRED") {
    await prisma.$transaction(async (tx) => {
      await tx.ticketQuote.updateMany({ where: { ticketId }, data: { status: "REJECTED" } })
      await tx.ticketQuote.updateMany({ where: { id: { in: selectedIds } }, data: { status: "SELECTED" } })
      await tx.maintenanceRequest.update({
        where: { id: ticketId },
        data: { totalAmount: total, status: "IN_PROGRESS", vendorId: primaryVendorId },
      })
    })
    await addTimeline(ticketId, "STATUS_CHANGE", `Cotizaciones seleccionadas: ${vendorNames} — Total Q${total.toFixed(2)}`)
    await logActivity({ orgId, entityType: "TICKET", entityId: ticketId, action: "QUOTE_SELECTED", actorId: userId, actorName, metadata: { vendors: vendorNames, amount: total } })
  } else {
    return { error: "Sin autoridad para seleccionar cotizaciones" }
  }
  revalidatePath(`/mantenimiento/${ticketId}`)
  return { ok: true }
}

export async function addTicketPayment(ticketId: string, formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")

  const amount = parseFloat(formData.get("amount") as string) || 0
  const method = formData.get("method") as string
  const dateRaw = formData.get("date") as string
  const vendorId = formData.get("vendorId") as string || null
  const reference = formData.get("reference") as string || null
  const notes = formData.get("notes") as string || null
  const percentageOfTotal = formData.get("percentageOfTotal") ? parseFloat(formData.get("percentageOfTotal") as string) : null
  const closesWithDiscount = formData.get("closesWithDiscount") === "true"
  const discountAmount = formData.get("discountAmount") ? parseFloat(formData.get("discountAmount") as string) : null
  const discountReason = formData.get("discountReason") as string || null

  if (!amount || !method || !dateRaw) return { error: "Monto, método y fecha requeridos" }

  // Service Acceptance cap enforcement
  const check = await canMakePayment({
    entityType: "TICKET", entityId: ticketId,
    proposedAmount: amount, paymentMethod: method, orgId,
  })
  if (!check.allowed) {
    return { error: check.reason ?? "Pago bloqueado por la regla de aceptación de servicios" }
  }

  await prisma.ticketPayment.create({
    data: { ticketId, vendorId, amount, method, date: new Date(dateRaw), reference, notes, percentageOfTotal, closesWithDiscount, discountAmount, discountReason },
  })
  const payments = await prisma.ticketPayment.findMany({ where: { ticketId } })
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  await prisma.maintenanceRequest.update({ where: { id: ticketId }, data: { amountPaid: paid, actualCost: paid } })
  await addTimeline(ticketId, "PAYMENT", `Pago registrado: Q${amount.toFixed(2)} via ${method}`)
  await logActivity({ orgId, entityType: "TICKET", entityId: ticketId, action: "PAYMENT_REGISTERED", actorId: userId, actorName, metadata: { amount, method, percentageOfTotal, closesWithDiscount, discountAmount } })
  revalidatePath(`/mantenimiento/${ticketId}`)
}

export async function escalateToProject(ticketId: string, projectName: string) {
  const { orgId, userId, actorName } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({
    where: { id: ticketId, organizationId: orgId },
    include: { property: true },
  })
  if (!ticket) throw new Error("Ticket no encontrado")

  const project = await prisma.project.create({
    data: {
      organizationId: orgId,
      propertyId: ticket.propertyId,
      type: "MAINTENANCE",
      name: projectName || `Proyecto: ${ticket.title}`,
      description: ticket.description,
      status: "PLANNING",
    },
  })
  await prisma.maintenanceRequest.update({
    where: { id: ticketId },
    data: { escalatedToProjectId: project.id, escalatedAt: new Date(), escalatedById: userId },
  })
  await addTimeline(ticketId, "ESCALATED", `Escalado a proyecto: ${project.name}`)
  await logActivity({ orgId, entityType: "TICKET", entityId: ticketId, action: "ESCALATED", actorId: userId, actorName, metadata: { projectId: project.id, projectName: project.name } })
  await logActivity({ orgId, entityType: "PROJECT", entityId: project.id, projectId: project.id, action: "CREATED", actorId: userId, actorName, metadata: { name: project.name, fromTicket: ticketId } })
  revalidatePath(`/mantenimiento/${ticketId}`)
  revalidatePath("/proyectos")
  return { redirectTo: `/proyectos/${project.id}` }
}

export async function addTimelineNote(ticketId: string, message: string) {
  const { orgId } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")
  await addTimeline(ticketId, "NOTE", message)
  revalidatePath(`/mantenimiento/${ticketId}`)
}

export async function deleteTicket(id: string) {
  const { orgId, userId, actorName } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id, organizationId: orgId }, select: { ticketNumber: true, title: true } })
  await logActivity({ orgId, entityType: "TICKET", entityId: id, action: "DELETED", actorId: userId, actorName, metadata: { ticketNumber: ticket?.ticketNumber, title: ticket?.title } })
  await prisma.maintenanceRequest.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/mantenimiento")
  redirect("/mantenimiento")
}
