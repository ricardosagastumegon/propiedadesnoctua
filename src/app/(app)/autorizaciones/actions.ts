"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { revalidatePath } from "next/cache"

async function getIds() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user!.id!,
    orgId: (session.user as any).organizationId as string,
    actorName: session.user!.name ?? "Usuario",
  }
}

async function getApprovalContext(id: string, orgId: string) {
  return prisma.approvalRequest.findFirst({
    where: { id, organizationId: orgId },
    select: { entityType: true, entityId: true, title: true, amount: true },
  })
}

export async function approveRequest(id: string) {
  const { userId, orgId, actorName } = await getIds()
  const req = await getApprovalContext(id, orgId)
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
  })

  // If it's a PROJECT_PARTIDA, also update the partida
  if (req?.entityType === "PROJECT_PARTIDA") {
    const ar = await prisma.approvalRequest.findFirst({ where: { id }, select: { relatedId: true, entityId: true } })
    if (ar?.relatedId) {
      const quote = await prisma.quote.findUnique({ where: { id: ar.relatedId }, select: { total: true, vendorId: true } })
      if (quote) {
        await prisma.projectPartida.update({
          where: { id: ar.entityId },
          data: { approvedQuoteId: ar.relatedId, vendorId: quote.vendorId, amountApproved: quote.total, status: "APPROVED" },
        })
        await prisma.quote.update({ where: { id: ar.relatedId }, data: { status: "APPROVED", approvedAt: new Date() } })
      }
    }
  }

  // If it's a TICKET quote approval, update the ticket
  if (req?.entityType === "TICKET") {
    const ar = await prisma.approvalRequest.findFirst({ where: { id }, select: { relatedId: true, entityId: true } })
    if (ar?.relatedId) {
      const quote = await prisma.ticketQuote.findUnique({ where: { id: ar.relatedId }, select: { amount: true, vendorId: true } })
      if (quote) {
        await prisma.ticketQuote.updateMany({ where: { ticketId: ar.entityId }, data: { status: "REJECTED" } })
        await prisma.ticketQuote.update({ where: { id: ar.relatedId }, data: { status: "SELECTED" } })
        await prisma.maintenanceRequest.update({ where: { id: ar.entityId }, data: { vendorId: quote.vendorId, totalAmount: quote.amount, status: "IN_PROGRESS" } })
      }
    }
  }

  const projectId = req?.entityType === "PROJECT_PARTIDA"
    ? (await prisma.projectPartida.findUnique({ where: { id: req.entityId }, select: { projectId: true } }))?.projectId
    : undefined

  await logActivity({ orgId, entityType: "APPROVAL", entityId: id, projectId: projectId ?? null, action: "APPROVED", actorId: userId, actorName, metadata: { title: req?.title, amount: req?.amount } })
  revalidatePath("/autorizaciones")
  if (projectId) revalidatePath(`/proyectos/${projectId}`)
}

export async function rejectRequest(id: string, reason: string) {
  const { userId, orgId, actorName } = await getIds()
  const req = await getApprovalContext(id, orgId)
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { status: "REJECTED", rejectedById: userId, rejectedAt: new Date(), rejectionReason: reason },
  })
  const projectId = req?.entityType === "PROJECT_PARTIDA"
    ? (await prisma.projectPartida.findUnique({ where: { id: req.entityId }, select: { projectId: true } }))?.projectId
    : undefined
  await logActivity({ orgId, entityType: "APPROVAL", entityId: id, projectId: projectId ?? null, action: "REJECTED", actorId: userId, actorName, metadata: { title: req?.title, reason } })
  revalidatePath("/autorizaciones")
  if (projectId) revalidatePath(`/proyectos/${projectId}`)
}

export async function cosignRequest(id: string) {
  const { userId, orgId, actorName } = await getIds()
  const req = await getApprovalContext(id, orgId)
  await prisma.approvalRequest.updateMany({
    where: { id, organizationId: orgId },
    data: { status: "APPROVED", cosignedAt: new Date(), approvedById: userId, approvedAt: new Date() },
  })

  // Also apply approval side-effects
  if (req?.entityType === "PROJECT_PARTIDA") {
    const ar = await prisma.approvalRequest.findFirst({ where: { id }, select: { relatedId: true, entityId: true } })
    if (ar?.relatedId) {
      const quote = await prisma.quote.findUnique({ where: { id: ar.relatedId }, select: { total: true, vendorId: true } })
      if (quote) {
        await prisma.projectPartida.update({
          where: { id: ar.entityId },
          data: { approvedQuoteId: ar.relatedId, vendorId: quote.vendorId, amountApproved: quote.total, status: "APPROVED" },
        })
        await prisma.quote.update({ where: { id: ar.relatedId }, data: { status: "APPROVED", approvedAt: new Date() } })
      }
    }
  }

  if (req?.entityType === "TICKET") {
    const ar = await prisma.approvalRequest.findFirst({ where: { id }, select: { relatedId: true, entityId: true } })
    if (ar?.relatedId) {
      const quote = await prisma.ticketQuote.findUnique({ where: { id: ar.relatedId }, select: { amount: true, vendorId: true } })
      if (quote) {
        await prisma.ticketQuote.updateMany({ where: { ticketId: ar.entityId }, data: { status: "REJECTED" } })
        await prisma.ticketQuote.update({ where: { id: ar.relatedId }, data: { status: "SELECTED" } })
        await prisma.maintenanceRequest.update({ where: { id: ar.entityId }, data: { vendorId: quote.vendorId, totalAmount: quote.amount, status: "IN_PROGRESS" } })
      }
    }
  }

  const projectId = req?.entityType === "PROJECT_PARTIDA"
    ? (await prisma.projectPartida.findUnique({ where: { id: req.entityId }, select: { projectId: true } }))?.projectId
    : undefined

  await logActivity({ orgId, entityType: "APPROVAL", entityId: id, projectId: projectId ?? null, action: "COSIGNED", actorId: userId, actorName, metadata: { title: req?.title, amount: req?.amount } })
  revalidatePath("/autorizaciones")
  if (projectId) revalidatePath(`/proyectos/${projectId}`)
}
