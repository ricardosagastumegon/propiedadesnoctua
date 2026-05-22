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
    userId: session.user.id,
    orgId: session.user.organizationId,
    authorityPolicy: session.user.authorityPolicy,
    actorName: session.user.name ?? "Usuario",
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
  const { orgId, userId, actorName, authorityPolicy } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id, organizationId: orgId } })
  if (!ticket) return { error: "Ticket no encontrado" }

  await prisma.maintenanceRequest.update({
    where: { id },
    data: { paymentMode, vendorId: vendorId || null },
  })
  await addTimeline(id, "NOTE", `Modo de pago: ${paymentMode}${vendorId ? " (con proveedor)" : ""}`)

  // CONTADO mode: always requires authorization, regardless of amount
  if (paymentMode === "CONTADO" && !ticket.approvalRequestId) {
    if (!authorityPolicy || authorityPolicy === "NONE") {
      return { error: "Sin autoridad para solicitar autorización de pago contado" }
    }
    const status = authorityPolicy === "ALONE" ? "PENDING" : "PENDING_COSIGN"
    const approvalReq = await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        requestedById: userId,
        entityType: "TICKET",
        entityId: id,
        title: `Pago Contado — ${ticket.ticketNumber}: ${ticket.title}`,
        amount: ticket.totalAmount ?? ticket.estimatedCost ?? null,
        notes: "Pago Contado: 100% en un solo pago — requiere autorización",
        status,
      },
    })
    await prisma.maintenanceRequest.update({
      where: { id },
      data: { approvalRequestId: approvalReq.id },
    })
    await addTimeline(id, "NOTE", "Pago Contado: enviado a autorización (100% en un solo pago)")
    await logActivity({
      orgId, entityType: "TICKET", entityId: id, action: "APPROVAL_REQUESTED",
      actorId: userId, actorName,
      metadata: { reason: "Pago Contado", amount: ticket.totalAmount },
    })
    revalidatePath("/autorizaciones")
  }

  revalidatePath(`/mantenimiento/${id}`)
  return { ok: true }
}

export async function addTicketQuote(ticketId: string, formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")

  const vendorId = formData.get("vendorId") as string
  const notes = formData.get("notes") as string || null
  const vendorReference = formData.get("vendorReference") as string || null
  const validUntilRaw = formData.get("validUntil") as string || null
  const taxPercent = parseFloat((formData.get("taxPercent") as string) || "12")
  const itemsJson = (formData.get("items") as string) || "[]"

  if (!vendorId) return { error: "Proveedor requerido" }

  let items: Array<{ description: string; quantity: number; unit: string | null; unitPrice: number; total: number }> = []
  try { items = JSON.parse(itemsJson) } catch { return { error: "Items inválidos" } }
  if (!items.length) return { error: "Agregá al menos un rubro" }

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0)
  const taxAmount = subtotal * (taxPercent / 100)
  const total = subtotal + taxAmount

  const quote = await prisma.quote.create({
    data: {
      organizationId: orgId,
      ticketId,
      vendorId,
      vendorReference,
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
      subtotal,
      taxAmount,
      taxPercent,
      total,
      status: "PENDING",
      notes,
      createdById: userId,
      items: {
        create: items.map((it, idx) => ({
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          total: it.total,
          orderIndex: idx,
        })),
      },
    },
  })

  await addTimeline(ticketId, "QUOTE_ADDED", `Cotización agregada: Q${total.toFixed(2)} (${items.length} rubros)`)
  await logActivity({ orgId, entityType: "TICKET", entityId: ticketId, action: "QUOTE_ADDED", actorId: userId, actorName, metadata: { amount: total, vendorId, items: items.length } })
  revalidatePath(`/mantenimiento/${ticketId}`)
  return { ok: true, quoteId: quote.id }
}

import { TICKET_AUTH_THRESHOLD, TICKET_PROJECT_THRESHOLD } from "./constants"

export async function finalizeTicketSelection(ticketId: string, selectedIds: string[]) {
  const { orgId, authorityPolicy, userId, actorName } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")
  if (!selectedIds.length) return { error: "Selecciona al menos una cotización" }

  const selected = await prisma.quote.findMany({
    where: { id: { in: selectedIds }, ticketId },
    include: { vendor: { select: { name: true } } },
  })
  if (selected.length !== selectedIds.length) return { error: "Cotizaciones inválidas" }

  const total = selected.reduce((s, q) => s + q.total, 0)
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
      await tx.quote.updateMany({ where: { ticketId }, data: { status: "REJECTED" } })
      await tx.quote.updateMany({ where: { id: { in: selectedIds } }, data: { status: "SELECTED" } })
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
      await tx.quote.updateMany({ where: { ticketId }, data: { status: "REJECTED" } })
      await tx.quote.updateMany({ where: { id: { in: selectedIds } }, data: { status: "SELECTED" } })
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

  // Validación: el ticket debe tener modo de pago definido
  if (!ticket.paymentMode) {
    return { error: "Debés definir el modo de pago del ticket antes de registrar pagos." }
  }

  // Validación: monto no puede exceder lo aprobado/cotizado
  const approved = ticket.totalAmount ?? 0
  if (approved > 0) {
    const effectiveNewPaid = ticket.amountPaid + amount + (closesWithDiscount ? (discountAmount ?? 0) : 0)
    if (effectiveNewPaid > approved + 0.01) {
      const saldo = Math.max(0, approved - ticket.amountPaid - (closesWithDiscount ? (discountAmount ?? 0) : 0))
      return { error: `El pago excede el monto aprobado. Saldo disponible: Q ${saldo.toFixed(2)}` }
    }
  }

  // Service Acceptance cap enforcement
  const check = await canMakePayment({
    entityType: "TICKET", entityId: ticketId,
    proposedAmount: amount, paymentMethod: method, orgId,
    discountAmount: closesWithDiscount ? discountAmount : null,
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
