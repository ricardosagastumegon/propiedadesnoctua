"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { projectSchema, projectCostSchema, partidaSchema, partidaPaymentSchema } from "@/lib/schemas/project"
import { logActivity } from "@/lib/activity-log"
import { canMakePayment } from "@/lib/service-acceptance"

export async function addPartidaQuote(partidaId: string, projectId: string, formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  const orgId = (session.user as any).organizationId as string
  const userId = session.user!.id!
  const actorName = session.user!.name ?? "Usuario"
  const authorityPolicy = (session.user as any).authorityPolicy as string | undefined

  const partida = await prisma.projectPartida.findFirst({ where: { id: partidaId, projectId }, include: { project: { select: { name: true } } } })
  if (!partida) throw new Error("Partida no encontrada")

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
      partidaId, projectId, vendorId, vendorReference,
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
      subtotal, taxAmount, taxPercent, total,
      status: "PENDING", notes, createdById: userId,
      items: { create: items.map((it, idx) => ({ ...it, orderIndex: idx })) },
    },
  })
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { name: true } })
  await logActivity({
    orgId, entityType: "PARTIDA", entityId: partidaId, projectId, action: "QUOTE_ADDED",
    actorId: userId, actorName,
    metadata: { vendor: vendor?.name, amount: total, partida: partida.name, items: items.length },
  })

  // For users that need cosign, auto-create approval request
  if (authorityPolicy === "COSIGN_REQUIRED") {
    const approvalReq = await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        requestedById: userId,
        entityType: "PROJECT_PARTIDA",
        entityId: partidaId,
        relatedId: quote.id,
        title: `Aprobar cotización: ${vendor?.name ?? "proveedor"} — ${partida.project?.name ?? "proyecto"}`,
        amount: total,
        notes: `Partida: ${partida.name}`,
        status: "PENDING_COSIGN",
      },
    })
    await logActivity({
      orgId, entityType: "APPROVAL", entityId: approvalReq.id, projectId,
      action: "APPROVAL_REQUESTED", actorId: userId, actorName,
      metadata: { vendor: vendor?.name, amount: total, partida: partida.name },
    })
    revalidatePath("/autorizaciones")
  }

  revalidatePath(`/proyectos/${projectId}`)
  return { ok: true, quoteId: quote.id }
}
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

export async function createProject(formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const raw = Object.fromEntries(formData)
  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const project = await prisma.project.create({
    data: {
      organizationId: orgId,
      ...parsed.data,
      propertyId: parsed.data.propertyId || null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      budgetEstimate: parsed.data.budgetEstimate ?? null,
    },
  })
  await logActivity({ orgId, entityType: "PROJECT", entityId: project.id, projectId: project.id, action: "CREATED", actorId: userId, actorName, metadata: { name: project.name } })
  revalidatePath("/proyectos")
  return { redirectTo: `/proyectos/${project.id}` }
}

export async function updateProject(id: string, formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const raw = Object.fromEntries(formData)
  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.project.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...parsed.data,
      propertyId: parsed.data.propertyId || null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      budgetEstimate: parsed.data.budgetEstimate ?? null,
    },
  })
  await logActivity({ orgId, entityType: "PROJECT", entityId: id, projectId: id, action: "UPDATED", actorId: userId, actorName, metadata: { name: parsed.data.name } })
  revalidatePath(`/proyectos/${id}`)
  revalidatePath("/proyectos")
  return { redirectTo: `/proyectos/${id}` }
}

export async function deleteProject(id: string) {
  const { orgId, userId, actorName } = await getSession()
  const project = await prisma.project.findFirst({ where: { id, organizationId: orgId }, select: { name: true } })
  await logActivity({ orgId, entityType: "PROJECT", entityId: id, projectId: id, action: "DELETED", actorId: userId, actorName, metadata: { name: project?.name } })
  await prisma.project.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/proyectos")
  redirect("/proyectos")
}

export async function updateTaskStatus(taskId: string, projectId: string, done: boolean) {
  await prisma.projectTask.update({
    where: { id: taskId },
    data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null },
  })
  const tasks = await prisma.projectTask.findMany({ where: { projectId } })
  const doneCount = tasks.filter(t => t.status === "DONE").length
  const percent = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
  await prisma.project.update({ where: { id: projectId }, data: { progressPercent: percent } })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function createTask(projectId: string, formData: FormData) {
  const { orgId } = await getSession()
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
  if (!project) throw new Error("Proyecto no encontrado")

  const name = formData.get("name") as string
  if (!name?.trim()) return { error: { name: ["Nombre requerido"] } }

  const maxOrder = await prisma.projectTask.aggregate({ _max: { orderIndex: true }, where: { projectId } })
  await prisma.projectTask.create({
    data: { projectId, name, orderIndex: (maxOrder._max.orderIndex ?? -1) + 1 },
  })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function deleteTask(taskId: string, projectId: string) {
  await prisma.projectTask.delete({ where: { id: taskId } })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function addProjectCost(projectId: string, formData: FormData) {
  const { orgId } = await getSession()
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
  if (!project) throw new Error("Proyecto no encontrado")

  const raw = Object.fromEntries(formData)
  const parsed = projectCostSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.projectCost.create({
    data: { projectId, ...parsed.data, date: new Date(parsed.data.date) },
  })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function deleteProjectCost(costId: string, projectId: string) {
  await prisma.projectCost.delete({ where: { id: costId } })
  revalidatePath(`/proyectos/${projectId}`)
}

// Partidas CRUD
export async function createPartida(projectId: string, formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
  if (!project) return { error: "Proyecto no encontrado" }

  const raw = Object.fromEntries(formData)
  const parsed = partidaSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const maxOrder = await prisma.projectPartida.aggregate({ _max: { orderIndex: true }, where: { projectId } })
  const partida = await prisma.projectPartida.create({
    data: {
      projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      budgetEstimate: parsed.data.budgetEstimate ?? null,
      notes: parsed.data.notes,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  })
  await logActivity({ orgId, entityType: "PARTIDA", entityId: partida.id, projectId, action: "CREATED", actorId: userId, actorName, metadata: { name: partida.name } })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function deletePartida(partidaId: string, projectId: string) {
  const { orgId, userId, actorName } = await getSession()
  const partida = await prisma.projectPartida.findUnique({ where: { id: partidaId }, select: { name: true } })
  await logActivity({ orgId, entityType: "PARTIDA", entityId: partidaId, projectId, action: "DELETED", actorId: userId, actorName, metadata: { name: partida?.name } })
  await prisma.projectPartida.delete({ where: { id: partidaId } })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function cancelPartida(partidaId: string, projectId: string) {
  const { orgId, userId, actorName } = await getSession()
  const partida = await prisma.projectPartida.findUnique({ where: { id: partidaId }, select: { name: true } })
  await prisma.projectPartida.update({ where: { id: partidaId }, data: { status: "CANCELLED" } })
  await logActivity({ orgId, entityType: "PARTIDA", entityId: partidaId, projectId, action: "CANCELLED", actorId: userId, actorName, metadata: { name: partida?.name } })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function markPartidaDelivered(partidaId: string, projectId: string) {
  const { orgId, userId, actorName } = await getSession()
  const partida = await prisma.projectPartida.findUnique({ where: { id: partidaId }, select: { name: true } })
  await prisma.projectPartida.update({ where: { id: partidaId }, data: { deliveredAt: new Date() } })
  await logActivity({ orgId, entityType: "PARTIDA", entityId: partidaId, projectId, action: "DELIVERED", actorId: userId, actorName, metadata: { name: partida?.name } })
  revalidatePath(`/proyectos/${projectId}`)
}

// Direct approval (ALONE authority) or creates approval request (COSIGN_REQUIRED)
export async function requestQuoteApprovalForPartida(
  partidaId: string,
  quoteId: string,
  projectId: string,
) {
  const { userId, orgId, authorityPolicy, actorName } = await getSession()

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { vendor: { select: { name: true } } },
  })
  if (!quote) throw new Error("Cotizacion no encontrada")

  if (authorityPolicy === "ALONE") {
    await prisma.projectPartida.update({
      where: { id: partidaId },
      data: {
        approvedQuoteId: quoteId,
        vendorId: quote.vendorId,
        amountApproved: quote.total,
        status: "APPROVED",
      },
    })
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "APPROVED", approvedAt: new Date() } })
    await logActivity({ orgId, entityType: "PARTIDA", entityId: partidaId, projectId, action: "APPROVED", actorId: userId, actorName, metadata: { vendor: quote.vendor?.name, amount: quote.total } })
  } else if (authorityPolicy === "COSIGN_REQUIRED") {
    const partida = await prisma.projectPartida.findUnique({
      where: { id: partidaId },
      include: { project: { select: { name: true } } },
    })
    const approvalReq = await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        requestedById: userId,
        entityType: "PROJECT_PARTIDA",
        entityId: partidaId,
        relatedId: quoteId,
        title: `Aprobar cotización: ${quote.vendor?.name ?? "proveedor"} — ${partida?.project?.name ?? "proyecto"}`,
        amount: quote.total,
        notes: `Partida: ${partida?.name ?? partidaId}`,
        status: "PENDING_COSIGN",
      },
    })
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "PENDING" } })
    await logActivity({ orgId, entityType: "APPROVAL", entityId: approvalReq.id, projectId, action: "APPROVAL_REQUESTED", actorId: userId, actorName, metadata: { vendor: quote.vendor?.name, amount: quote.total, partida: partida?.name } })
  } else {
    throw new Error("Sin autoridad para aprobar")
  }

  revalidatePath(`/proyectos/${projectId}`)
  revalidatePath("/autorizaciones")
}

export async function addPartidaPayment(partidaId: string, projectId: string, formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const raw = Object.fromEntries(formData)
  const parsed = partidaPaymentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const type = (formData.get("type") as string) || "PARTIAL"
  const percentageOfTotal = formData.get("percentageOfTotal") ? parseFloat(formData.get("percentageOfTotal") as string) : null
  const closesWithDiscount = formData.get("closesWithDiscount") === "true"
  const discountAmount = formData.get("discountAmount") ? parseFloat(formData.get("discountAmount") as string) : null
  const discountReason = formData.get("discountReason") as string || null

  // Service Acceptance cap enforcement
  const check = await canMakePayment({
    entityType: "PARTIDA", entityId: partidaId,
    proposedAmount: parsed.data.amount,
    paymentMethod: parsed.data.method,
    orgId,
  })
  if (!check.allowed) {
    return { error: check.reason ?? "Pago bloqueado por la regla de aceptación de servicios" }
  }

  const payment = await prisma.partidaPayment.create({
    data: { partidaId, ...parsed.data, type, date: new Date(parsed.data.date), percentageOfTotal, closesWithDiscount, discountAmount, discountReason },
  })
  const payments = await prisma.partidaPayment.findMany({ where: { partidaId } })
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  const partida = await prisma.projectPartida.findUnique({
    where: { id: partidaId },
    select: { amountApproved: true, deliveredAt: true, name: true, vendor: { select: { name: true } } },
  })
  const isFullyPaid = partida && (partida.amountApproved ?? 0) > 0 && paid >= (partida.amountApproved ?? 0)
  const newStatus = partida?.deliveredAt && isFullyPaid
    ? "PAID"
    : partida?.deliveredAt
    ? "DELIVERED"
    : "IN_PROGRESS"
  await prisma.projectPartida.update({ where: { id: partidaId }, data: { amountPaid: paid, status: newStatus } })
  await logActivity({
    orgId, entityType: "PAYMENT", entityId: payment.id, projectId, action: "PAYMENT_REGISTERED",
    actorId: userId, actorName,
    metadata: { amount: parsed.data.amount, method: parsed.data.method, type, partida: partida?.name, vendor: partida?.vendor?.name, percentageOfTotal, closesWithDiscount, discountAmount },
  })
  revalidatePath(`/proyectos/${projectId}`)
}
