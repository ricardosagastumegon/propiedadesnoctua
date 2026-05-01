"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { projectSchema, projectCostSchema } from "@/lib/schemas/project"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

export async function createProject(formData: FormData) {
  const orgId = await getOrgId()
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
    },
  })
  revalidatePath("/proyectos")
  redirect(`/proyectos/${project.id}`)
}

export async function updateProject(id: string, formData: FormData) {
  const orgId = await getOrgId()
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
    },
  })
  revalidatePath(`/proyectos/${id}`)
  revalidatePath("/proyectos")
  redirect(`/proyectos/${id}`)
}

export async function deleteProject(id: string) {
  const orgId = await getOrgId()
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
  const orgId = await getOrgId()
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
  const orgId = await getOrgId()
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
  if (!project) throw new Error("Proyecto no encontrado")

  const raw = Object.fromEntries(formData)
  const parsed = projectCostSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.projectCost.create({
    data: { projectId, ...parsed.data, date: new Date(parsed.data.date) },
  })
  const costs = await prisma.projectCost.findMany({ where: { projectId } })
  const spent = costs.reduce((s, c) => s + c.amount, 0)
  await prisma.project.update({ where: { id: projectId }, data: { budgetSpent: spent } })
  revalidatePath(`/proyectos/${projectId}`)
}

export async function deleteProjectCost(costId: string, projectId: string) {
  await prisma.projectCost.delete({ where: { id: costId } })
  const costs = await prisma.projectCost.findMany({ where: { projectId } })
  const spent = costs.reduce((s, c) => s + c.amount, 0)
  await prisma.project.update({ where: { id: projectId }, data: { budgetSpent: spent } })
  revalidatePath(`/proyectos/${projectId}`)
}
