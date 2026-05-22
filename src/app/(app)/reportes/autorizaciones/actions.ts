"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { tryGuard } from "@/lib/action-guard"

async function getIds() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user.id,
    orgId: session.user.organizationId,
  }
}

export async function markOrphanRejected(id: string) {
  const g = await tryGuard({ module: "autorizaciones", action: "edit" })
  if ("error" in g) return
  const { orgId, userId } = await getIds()
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: {
      status: "REJECTED",
      rejectedById: userId,
      rejectedAt: new Date(),
      rejectionReason: "Cancelada — entidad huérfana (registro eliminado)",
    },
  })
  revalidatePath("/reportes/autorizaciones")
  revalidatePath("/autorizaciones")
}

export async function forceApprove(id: string) {
  const g = await tryGuard({ module: "autorizaciones", action: "edit" })
  if ("error" in g) return
  const { orgId, userId } = await getIds()
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: {
      status: "APPROVED",
      approvedById: userId,
      approvedAt: new Date(),
      notes: "Aprobada manualmente desde herramienta de diagnóstico",
    },
  })
  revalidatePath("/reportes/autorizaciones")
  revalidatePath("/autorizaciones")
}
