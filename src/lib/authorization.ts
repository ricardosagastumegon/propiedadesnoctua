"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getSession() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user!.id!,
    orgId: (session.user as any).organizationId as string,
    role: (session.user as any).role as string,
    authorityPolicy: (session.user as any).authorityPolicy as string ?? "NONE",
  }
}

export async function createApprovalRequest(
  entityType: string,
  entityId: string,
  notes?: string,
) {
  const { userId, orgId } = await getSession()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("Usuario no encontrado")

  if (user.authorityPolicy === "ALONE") {
    return { status: "AUTO_APPROVED" as const }
  }

  // Check if there is already a pending request for this entity
  const existing = await prisma.approvalRequest.findFirst({
    where: { entityType, entityId, status: { in: ["PENDING", "PENDING_COSIGN"] } },
  })
  if (existing) return { status: "EXISTING" as const, id: existing.id }

  let status = "PENDING"
  let cosignerId: string | undefined

  if (user.authorityPolicy === "COSIGN_REQUIRED") {
    const policy = await prisma.cosignPolicy.findUnique({
      where: { userId },
      include: { allowedCosigners: true },
    })
    if (policy && policy.allowedCosigners.length > 0) {
      status = "PENDING_COSIGN"
      cosignerId = policy.allowedCosigners[0].id
    }
  }

  const req = await prisma.approvalRequest.create({
    data: {
      organizationId: orgId,
      entityType,
      entityId,
      requestedById: userId,
      cosignerId,
      status,
      notes,
    },
  })
  revalidatePath("/autorizaciones")
  return { status: "CREATED" as const, id: req.id, approvalStatus: status }
}

export async function approveRequest(id: string, notes?: string) {
  const { userId } = await getSession()
  await prisma.approvalRequest.update({
    where: { id },
    data: { status: "APPROVED", approvedById: userId, approvedAt: new Date(), notes: notes ?? undefined },
  })
  revalidatePath("/autorizaciones")
}

export async function rejectRequest(id: string, reason: string) {
  const { userId } = await getSession()
  await prisma.approvalRequest.update({
    where: { id },
    data: { status: "REJECTED", rejectedById: userId, rejectedAt: new Date(), rejectionReason: reason },
  })
  revalidatePath("/autorizaciones")
}

export async function cosignRequest(id: string) {
  const { userId } = await getSession()
  await prisma.approvalRequest.update({
    where: { id },
    data: { status: "APPROVED", cosignerId: userId, cosignedAt: new Date(), approvedById: userId, approvedAt: new Date() },
  })
  revalidatePath("/autorizaciones")
}

export async function getPendingCount(orgId: string): Promise<number> {
  return prisma.approvalRequest.count({
    where: { organizationId: orgId, status: { in: ["PENDING", "PENDING_COSIGN"] } },
  })
}
