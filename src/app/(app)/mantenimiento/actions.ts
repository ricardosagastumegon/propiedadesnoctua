"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { maintenanceSchema } from "@/lib/schemas/maintenance"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getSession() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user!.id!,
    orgId: (session.user as any).organizationId as string,
    authorityPolicy: (session.user as any).authorityPolicy as string | undefined,
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
  const { orgId } = await getSession()
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
  revalidatePath("/mantenimiento")
  return { redirectTo: `/mantenimiento/${ticket.id}` }
}

export async function updateTicketStatus(id: string, status: string, assigneeId?: string) {
  const { orgId } = await getSession()
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
  const { orgId } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")

  const vendorId = formData.get("vendorId") as string
  const amount = parseFloat(formData.get("amount") as string) || 0
  const notes = formData.get("notes") as string || null

  if (!vendorId || !amount) return { error: "Proveedor y monto requeridos" }

  await prisma.ticketQuote.create({ data: { ticketId, vendorId, amount, notes } })
  await addTimeline(ticketId, "QUOTE_ADDED", `Cotizacion agregada: Q${amount.toFixed(2)}`)
  revalidatePath(`/mantenimiento/${ticketId}`)
}

export async function selectTicketQuote(ticketId: string, quoteId: string) {
  const { orgId, authorityPolicy, userId } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")

  const quote = await prisma.ticketQuote.findUnique({ where: { id: quoteId }, include: { vendor: { select: { name: true } } } })
  if (!quote) throw new Error("Cotizacion no encontrada")

  if (authorityPolicy === "ALONE") {
    await prisma.$transaction([
      prisma.ticketQuote.updateMany({ where: { ticketId }, data: { status: "REJECTED" } }),
      prisma.ticketQuote.update({ where: { id: quoteId }, data: { status: "SELECTED" } }),
      prisma.maintenanceRequest.update({
        where: { id: ticketId },
        data: { vendorId: quote.vendorId, totalAmount: quote.amount, status: "IN_PROGRESS" },
      }),
    ])
    await addTimeline(ticketId, "STATUS_CHANGE", `Cotizacion seleccionada: ${quote.vendor.name} Q${quote.amount.toFixed(2)}`)
  } else if (authorityPolicy === "COSIGN_REQUIRED") {
    const approvalReq = await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        requestedById: userId,
        entityType: "TICKET",
        entityId: ticketId,
        relatedId: quoteId,
        title: `Aprobar cotizacion ticket ${ticket.ticketNumber}: ${quote.vendor.name}`,
        amount: quote.amount,
        status: "PENDING_COSIGN",
      },
    })
    await prisma.maintenanceRequest.update({
      where: { id: ticketId },
      data: { approvalRequestId: approvalReq.id },
    })
    await addTimeline(ticketId, "NOTE", `Cotizacion enviada a autorizaciones: ${quote.vendor.name}`)
    revalidatePath("/autorizaciones")
  } else {
    throw new Error("Sin autoridad para aprobar")
  }
  revalidatePath(`/mantenimiento/${ticketId}`)
}

export async function addTicketPayment(ticketId: string, formData: FormData) {
  const { orgId } = await getSession()
  const ticket = await prisma.maintenanceRequest.findFirst({ where: { id: ticketId, organizationId: orgId } })
  if (!ticket) throw new Error("Ticket no encontrado")

  const amount = parseFloat(formData.get("amount") as string) || 0
  const method = formData.get("method") as string
  const dateRaw = formData.get("date") as string
  const reference = formData.get("reference") as string || null
  const notes = formData.get("notes") as string || null
  const percentageOfTotal = formData.get("percentageOfTotal") ? parseFloat(formData.get("percentageOfTotal") as string) : null
  const closesWithDiscount = formData.get("closesWithDiscount") === "true"
  const discountAmount = formData.get("discountAmount") ? parseFloat(formData.get("discountAmount") as string) : null
  const discountReason = formData.get("discountReason") as string || null

  if (!amount || !method || !dateRaw) return { error: "Monto, método y fecha requeridos" }

  await prisma.ticketPayment.create({
    data: { ticketId, amount, method, date: new Date(dateRaw), reference, notes, percentageOfTotal, closesWithDiscount, discountAmount, discountReason },
  })
  const payments = await prisma.ticketPayment.findMany({ where: { ticketId } })
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  await prisma.maintenanceRequest.update({ where: { id: ticketId }, data: { amountPaid: paid, actualCost: paid } })
  await addTimeline(ticketId, "PAYMENT", `Pago registrado: Q${amount.toFixed(2)} via ${method}`)
  revalidatePath(`/mantenimiento/${ticketId}`)
}

export async function escalateToProject(ticketId: string, projectName: string) {
  const { orgId, userId } = await getSession()
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
  const { orgId } = await getSession()
  await prisma.maintenanceRequest.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/mantenimiento")
  redirect("/mantenimiento")
}
