"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

async function getIds() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user!.id!,
    orgId: (session.user as any).organizationId as string,
  }
}

export async function approveRequest(id: string) {
  const { userId, orgId } = await getIds()
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
  })
  revalidatePath("/autorizaciones")
}

export async function rejectRequest(id: string, reason: string) {
  const { userId, orgId } = await getIds()
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { status: "REJECTED", rejectedById: userId, rejectedAt: new Date(), rejectionReason: reason },
  })
  revalidatePath("/autorizaciones")
}

export async function cosignRequest(id: string) {
  const { userId, orgId } = await getIds()
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { status: "APPROVED", cosignedAt: new Date(), approvedById: userId, approvedAt: new Date() },
  })
  revalidatePath("/autorizaciones")
}
