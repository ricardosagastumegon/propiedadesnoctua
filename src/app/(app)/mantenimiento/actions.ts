"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { maintenanceSchema } from "@/lib/schemas/maintenance"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

async function nextTicketNumber(orgId: string) {
  const count = await prisma.maintenanceRequest.count({ where: { organizationId: orgId } })
  return `M-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`
}

export async function createTicket(formData: FormData) {
  const orgId = await getOrgId()
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
  revalidatePath("/mantenimiento")
  redirect(`/mantenimiento/${ticket.id}`)
}

export async function updateTicketStatus(id: string, status: string, assigneeId?: string) {
  const orgId = await getOrgId()
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
  revalidatePath(`/mantenimiento/${id}`)
  revalidatePath("/mantenimiento")
}

export async function updateTicketCost(id: string, actualCost: number, resolutionNotes: string) {
  const orgId = await getOrgId()
  await prisma.maintenanceRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { actualCost, resolutionNotes },
  })
  revalidatePath(`/mantenimiento/${id}`)
}

export async function deleteTicket(id: string) {
  const orgId = await getOrgId()
  await prisma.maintenanceRequest.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/mantenimiento")
  redirect("/mantenimiento")
}
