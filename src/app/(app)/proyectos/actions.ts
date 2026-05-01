"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { projectSchema, projectCostSchema, partidaSchema, partidaPaymentSchema } from "@/lib/schemas/project"
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

export async function createProject(formData: FormData) {
  const { orgId } = await getSession()
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
  revalidatePath("/proyectos")
  redirect(`/proyectos/${project.id}`)
}

export async function updateProject(id: string, formData: FormData) {
  const { orgId } = await getSession()
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
  revalidatePath(`/proyectos/${id}`)
  revalidatePath("/proyectos")
  redirect(`/proyectos/${id}`)
}

export async function deleteProject(id: string) {
  const { orgId } = await getSession()
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
  const { orgId } = await getSession()
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
  if (!project) return { error: "Proyecto no encontrado" }

  const raw = Object.fromEntries(formData)
  const parsed = partidaSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const maxOrder = await prisma.projectPartida.aggregate({ _max: { orderIndex: true }, where: { projectId } })
  await prisma.projectPartida.create({
    data: {
      projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      budgetEstimate: parsed.data.budgetEstimate ?? null,
      notes: parsed.data.notes,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function deletePartida(partidaId: string, projectId: string) {
  await prisma.projectPartida.delete({ where: { id: partidaId } })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function cancelPartida(partidaId: string, projectId: string) {
  await prisma.projectPartida.update({
    where: { id: partidaId },
    data: { status: "CANCELLED" },
  })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function markPartidaDelivered(partidaId: string, projectId: string) {
  await prisma.projectPartida.update({
    where: { id: partidaId },
    data: { deliveredAt: new Date() },
  })
  revalidatePath(`/proyectos/${projectId}`)
}

// Direct approval (ALONE authority) or creates approval request (COSIGN_REQUIRED)
export async function requestQuoteApprovalForPartida(
  partidaId: string,
  quoteId: string,
  projectId: string,
) {
  const { userId, orgId, authorityPolicy } = await getSession()

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { vendor: { select: { name: true } } },
  })
  if (!quote) throw new Error("Cotizacion no encontrada")

  if (authorityPolicy === "ALONE") {
    // Approve immediately
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
  } else if (authorityPolicy === "COSIGN_REQUIRED") {
    const partida = await prisma.projectPartida.findUnique({
      where: { id: partidaId },
      include: { project: { select: { name: true } } },
    })
    await prisma.approvalRequest.create({
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
    // Mark quote as pending approval
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "PENDING" } })
  } else {
    throw new Error("Sin autoridad para aprobar")
  }

  revalidatePath(`/proyectos/${projectId}`)
  revalidatePath("/autorizaciones")
}

export async function addPartidaPayment(partidaId: string, projectId: string, formData: FormData) {
  const raw = Object.fromEntries(formData)
  const parsed = partidaPaymentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const type = (formData.get("type") as string) || "PARTIAL"
  await prisma.partidaPayment.create({
    data: { partidaId, ...parsed.data, type, date: new Date(parsed.data.date) },
  })
  const payments = await prisma.partidaPayment.findMany({ where: { partidaId } })
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  const partida = await prisma.projectPartida.findUnique({
    where: { id: partidaId },
    select: { amountApproved: true, deliveredAt: true },
  })
  const isFullyPaid = partida && (partida.amountApproved ?? 0) > 0 && paid >= (partida.amountApproved ?? 0)
  const newStatus = partida?.deliveredAt && isFullyPaid
    ? "PAID"
    : partida?.deliveredAt
    ? "DELIVERED"
    : "IN_PROGRESS"
  await prisma.projectPartida.update({ where: { id: partidaId }, data: { amountPaid: paid, status: newStatus } })
  revalidatePath(`/proyectos/${projectId}`)
}
