import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import {
  DEFAULT_PREPAYMENT_CAP,
  ACCEPTANCE_CHECKLIST_ITEMS,
  PETTY_CASH_METHODS,
  type AcceptanceEntityType,
  type AcceptanceStatus,
} from "./service-acceptance-constants"

// Re-export for backwards compatibility (server-side callers)
export {
  DEFAULT_PREPAYMENT_CAP,
  ACCEPTANCE_CHECKLIST_ITEMS,
  PETTY_CASH_METHODS,
}
export type { AcceptanceEntityType, AcceptanceStatus }

export async function getPrepaymentCap(orgId: string): Promise<number> {
  const s = await prisma.organizationSettings.findUnique({ where: { organizationId: orgId } })
  return s?.prepaymentCapPercentage ?? DEFAULT_PREPAYMENT_CAP
}

interface ProgressResult {
  total: number
  totalPaid: number
  totalPaidExcludingPettyCash: number
  percentage: number
  percentageExcludingPettyCash: number
  pending: number
}

export async function getPaymentProgress(
  entityType: AcceptanceEntityType,
  entityId: string,
): Promise<ProgressResult> {
  if (entityType === "PARTIDA") {
    const p = await prisma.projectPartida.findUnique({
      where: { id: entityId },
      include: { payments: true },
    })
    if (!p) return { total: 0, totalPaid: 0, totalPaidExcludingPettyCash: 0, percentage: 0, percentageExcludingPettyCash: 0, pending: 0 }
    const total = p.amountApproved ?? 0
    const totalPaid = p.payments.reduce((s, x) => s + x.amount, 0)
    const totalPaidExcludingPettyCash = p.payments
      .filter(x => !PETTY_CASH_METHODS.includes(x.method))
      .reduce((s, x) => s + x.amount, 0)
    return {
      total,
      totalPaid,
      totalPaidExcludingPettyCash,
      percentage: total > 0 ? (totalPaid / total) * 100 : 0,
      percentageExcludingPettyCash: total > 0 ? (totalPaidExcludingPettyCash / total) * 100 : 0,
      pending: Math.max(0, total - totalPaid),
    }
  }
  const t = await prisma.maintenanceRequest.findUnique({
    where: { id: entityId },
    include: { ticketPayments: true, ticketQuotes: true },
  })
  if (!t) return { total: 0, totalPaid: 0, totalPaidExcludingPettyCash: 0, percentage: 0, percentageExcludingPettyCash: 0, pending: 0 }
  const selected = t.ticketQuotes.filter(q => q.status === "SELECTED")
  const total = selected.length > 0
    ? selected.reduce((s, q) => s + q.amount, 0)
    : (t.totalAmount ?? 0)
  const totalPaid = t.ticketPayments.reduce((s, x) => s + x.amount, 0)
  const totalPaidExcludingPettyCash = t.ticketPayments
    .filter(x => !PETTY_CASH_METHODS.includes(x.method))
    .reduce((s, x) => s + x.amount, 0)
  return {
    total,
    totalPaid,
    totalPaidExcludingPettyCash,
    percentage: total > 0 ? (totalPaid / total) * 100 : 0,
    percentageExcludingPettyCash: total > 0 ? (totalPaidExcludingPettyCash / total) * 100 : 0,
    pending: Math.max(0, total - totalPaid),
  }
}

export async function getActiveAcceptance(
  entityType: AcceptanceEntityType,
  entityId: string,
) {
  return prisma.serviceAcceptance.findFirst({
    where: { entityType, entityId, status: { in: ["PENDING", "ACCEPTED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true } },
      acceptedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
      photos: true,
    },
  })
}

export interface CanMakePaymentInput {
  entityType: AcceptanceEntityType
  entityId: string
  proposedAmount: number
  paymentMethod: string
  orgId: string
}

export interface CanMakePaymentResult {
  allowed: boolean
  reason?: string
  maxAllowedAmount?: number
  cap: number
  currentPercentage: number
  newPercentage: number
  hasAcceptance: boolean
  isPettyCash: boolean
  needsAcceptanceRequest: boolean
}

export async function canMakePayment(input: CanMakePaymentInput): Promise<CanMakePaymentResult> {
  const isPettyCash = PETTY_CASH_METHODS.includes(input.paymentMethod)
  const cap = await getPrepaymentCap(input.orgId)
  const progress = await getPaymentProgress(input.entityType, input.entityId)
  const acceptance = await getActiveAcceptance(input.entityType, input.entityId)
  const hasAcceptance = acceptance?.status === "ACCEPTED"

  const newPaid = progress.totalPaid + input.proposedAmount
  const newPercentage = progress.total > 0 ? (newPaid / progress.total) * 100 : 0
  const baseResult = {
    cap,
    currentPercentage: progress.percentage,
    newPercentage,
    hasAcceptance,
    isPettyCash,
  }

  if (isPettyCash) {
    return { ...baseResult, allowed: true, needsAcceptanceRequest: false }
  }

  if (hasAcceptance) {
    return { ...baseResult, allowed: true, needsAcceptanceRequest: false }
  }

  // No total set — let it through (no reference to measure against)
  if (progress.total <= 0) {
    return { ...baseResult, allowed: true, needsAcceptanceRequest: false }
  }

  if (newPercentage <= cap + 0.001) {
    return { ...baseResult, allowed: true, needsAcceptanceRequest: false }
  }

  const maxAllowedAmount = Math.max(0, (progress.total * cap) / 100 - progress.totalPaid)
  return {
    ...baseResult,
    allowed: false,
    reason: `Sin Aceptación de Servicio, sólo puede pagarse hasta el ${cap}% del compromiso. Pago propuesto llevaría al ${newPercentage.toFixed(1)}%.`,
    maxAllowedAmount,
    needsAcceptanceRequest: true,
  }
}

interface ContextSnapshot {
  entityType: AcceptanceEntityType
  entityId: string
  entityName: string
  vendor: { id: string; name: string } | null
  amountApproved: number | null
  amountPaid: number
  approvedQuoteId: string | null
  projectId: string | null
  projectName: string | null
  capturedAt: string
}

async function captureContextSnapshot(
  entityType: AcceptanceEntityType,
  entityId: string,
): Promise<ContextSnapshot> {
  if (entityType === "PARTIDA") {
    const p = await prisma.projectPartida.findUnique({
      where: { id: entityId },
      include: { vendor: true, project: true },
    })
    if (!p) throw new Error("Partida no encontrada")
    return {
      entityType, entityId,
      entityName: p.name,
      vendor: p.vendor ? { id: p.vendor.id, name: p.vendor.name } : null,
      amountApproved: p.amountApproved,
      amountPaid: p.amountPaid,
      approvedQuoteId: p.approvedQuoteId,
      projectId: p.projectId,
      projectName: p.project?.name ?? null,
      capturedAt: new Date().toISOString(),
    }
  }
  const t = await prisma.maintenanceRequest.findUnique({
    where: { id: entityId },
    include: { vendor: true, property: true },
  })
  if (!t) throw new Error("Ticket no encontrado")
  return {
    entityType, entityId,
    entityName: `${t.ticketNumber} — ${t.title}`,
    vendor: t.vendor ? { id: t.vendor.id, name: t.vendor.name } : null,
    amountApproved: t.totalAmount,
    amountPaid: t.amountPaid,
    approvedQuoteId: null,
    projectId: t.escalatedToProjectId,
    projectName: t.property?.name ?? null,
    capturedAt: new Date().toISOString(),
  }
}

interface RequestParams {
  orgId: string
  entityType: AcceptanceEntityType
  entityId: string
  requestedById: string
  requestedByName: string
}

export async function requestServiceAcceptance(params: RequestParams) {
  const { orgId, entityType, entityId, requestedById, requestedByName } = params

  // Supersede any prior PENDING acceptances for this entity
  await prisma.serviceAcceptance.updateMany({
    where: { entityType, entityId, status: "PENDING" },
    data: { status: "SUPERSEDED" },
  })

  const snapshot = await captureContextSnapshot(entityType, entityId)
  const projectId = snapshot.projectId

  const acceptance = await prisma.serviceAcceptance.create({
    data: {
      organizationId: orgId,
      entityType, entityId,
      projectId,
      status: "PENDING",
      requestedById,
      contextSnapshot: JSON.stringify(snapshot),
    },
  })

  // Notify all users with canAcceptServices=true (except the requester)
  const acceptors = await prisma.user.findMany({
    where: { organizationId: orgId, canAcceptServices: true, isActive: true, id: { not: requestedById } },
    select: { id: true },
  })
  if (acceptors.length > 0) {
    await prisma.notification.createMany({
      data: acceptors.map(a => ({
        organizationId: orgId,
        userId: a.id,
        type: "SERVICE_ACCEPTANCE_PENDING",
        title: "Aceptación de servicio pendiente",
        message: `${requestedByName} solicita aceptar ${snapshot.entityName}`,
        link: `/aceptaciones/${acceptance.id}`,
      })),
    })
  }

  await logActivity({
    orgId,
    entityType: entityType === "PARTIDA" ? "PARTIDA" : "TICKET",
    entityId,
    projectId,
    action: "ACCEPTANCE_REQUESTED",
    actorId: requestedById,
    actorName: requestedByName,
    metadata: { acceptanceId: acceptance.id, name: snapshot.entityName, vendor: snapshot.vendor?.name },
  })

  return acceptance
}

interface ChecklistItem { key: string; checked: boolean }

interface AcceptParams {
  orgId: string
  acceptanceId: string
  actorId: string
  actorName: string
  checklist: ChecklistItem[]
  rating: number
  notes?: string | null
  photos?: { url: string; caption?: string | null }[]
}

export async function acceptService(params: AcceptParams) {
  const { orgId, acceptanceId, actorId, actorName, checklist, rating, notes, photos } = params

  const actor = await prisma.user.findFirst({
    where: { id: actorId, organizationId: orgId },
  })
  if (!actor) throw new Error("Usuario no encontrado")
  if (!actor.canAcceptServices) throw new Error("No tienes permiso para aceptar servicios")

  const acceptance = await prisma.serviceAcceptance.findFirst({
    where: { id: acceptanceId, organizationId: orgId },
  })
  if (!acceptance) throw new Error("Aceptación no encontrada")
  if (acceptance.status !== "PENDING") throw new Error("Esta aceptación ya fue resuelta")
  if (acceptance.requestedById === actorId) throw new Error("No puedes aceptar tu propia solicitud (conflicto de interés)")

  // Conflict of interest: cannot accept if user was the firstApprover/cosigner of the approved quote
  await assertNoApprovalConflict(orgId, acceptance.entityType as AcceptanceEntityType, acceptance.entityId, actorId)

  // Required checklist must all be true
  const missing = checklist.filter(c => !c.checked).map(c => c.key)
  if (missing.length > 0) {
    throw new Error("Todos los puntos del checklist son obligatorios para aceptar")
  }
  if (!rating || rating < 1 || rating > 5) {
    throw new Error("Debe asignarse una calificación de 1 a 5")
  }
  if (!photos || photos.length < 1) {
    throw new Error("Debe adjuntarse al menos una foto de evidencia")
  }

  const now = new Date()

  const verificationPayload = {
    acceptanceId,
    entityType: acceptance.entityType,
    entityId: acceptance.entityId,
    actorId,
    actorName,
    rating,
    checklist,
    notes: notes ?? null,
    photoCount: photos.length,
    timestamp: now.toISOString(),
  }
  const verificationHash = createHash("sha256")
    .update(JSON.stringify(verificationPayload))
    .digest("hex")

  const updated = await prisma.serviceAcceptance.update({
    where: { id: acceptanceId },
    data: {
      status: "ACCEPTED",
      acceptedById: actorId,
      acceptedAt: now,
      checklist: JSON.stringify(checklist),
      rating,
      notes: notes ?? null,
      verificationHash,
      photos: {
        create: photos.map(p => ({ url: p.url, caption: p.caption ?? null })),
      },
    },
  })

  // Notify the requester
  await prisma.notification.create({
    data: {
      organizationId: orgId,
      userId: acceptance.requestedById,
      type: "SERVICE_ACCEPTED",
      title: "Servicio aceptado",
      message: `${actorName} aceptó el servicio. Ya puedes registrar el pago final.`,
      link: `/aceptaciones/${acceptanceId}`,
    },
  })

  // Snapshot of entity for metadata
  const snap = acceptance.contextSnapshot ? JSON.parse(acceptance.contextSnapshot) as ContextSnapshot : null
  await logActivity({
    orgId,
    entityType: acceptance.entityType,
    entityId: acceptance.entityId,
    projectId: acceptance.projectId,
    action: "SERVICE_ACCEPTED",
    actorId,
    actorName,
    metadata: { acceptanceId, rating, hash: verificationHash.slice(0, 12), name: snap?.entityName, vendor: snap?.vendor?.name },
  })

  return updated
}

interface RejectParams {
  orgId: string
  acceptanceId: string
  actorId: string
  actorName: string
  rejectionReason: string
  requiredCorrections?: string | null
}

export async function rejectServiceAcceptance(params: RejectParams) {
  const { orgId, acceptanceId, actorId, actorName, rejectionReason, requiredCorrections } = params

  const actor = await prisma.user.findFirst({ where: { id: actorId, organizationId: orgId } })
  if (!actor) throw new Error("Usuario no encontrado")
  if (!actor.canAcceptServices) throw new Error("No tienes permiso para rechazar servicios")

  const acceptance = await prisma.serviceAcceptance.findFirst({ where: { id: acceptanceId, organizationId: orgId } })
  if (!acceptance) throw new Error("Aceptación no encontrada")
  if (acceptance.status !== "PENDING") throw new Error("Esta aceptación ya fue resuelta")
  if (acceptance.requestedById === actorId) throw new Error("No puedes rechazar tu propia solicitud")
  if (!rejectionReason?.trim()) throw new Error("Razón de rechazo requerida")

  const updated = await prisma.serviceAcceptance.update({
    where: { id: acceptanceId },
    data: {
      status: "REJECTED",
      rejectedById: actorId,
      rejectedAt: new Date(),
      rejectionReason,
      requiredCorrections: requiredCorrections ?? null,
    },
  })

  // Return entity to correction state
  if (acceptance.entityType === "PARTIDA") {
    await prisma.projectPartida.update({
      where: { id: acceptance.entityId },
      data: { status: "IN_PROGRESS", deliveredAt: null },
    })
  } else if (acceptance.entityType === "TICKET") {
    await prisma.maintenanceRequest.update({
      where: { id: acceptance.entityId },
      data: { status: "IN_PROGRESS", completedAt: null },
    })
  }

  await prisma.notification.create({
    data: {
      organizationId: orgId,
      userId: acceptance.requestedById,
      type: "SERVICE_ACCEPTANCE_REJECTED",
      title: "Aceptación rechazada",
      message: `${actorName} rechazó la aceptación: ${rejectionReason}`,
      link: `/aceptaciones/${acceptanceId}`,
    },
  })

  const snap = acceptance.contextSnapshot ? JSON.parse(acceptance.contextSnapshot) as ContextSnapshot : null
  await logActivity({
    orgId,
    entityType: acceptance.entityType,
    entityId: acceptance.entityId,
    projectId: acceptance.projectId,
    action: "SERVICE_REJECTED",
    actorId,
    actorName,
    metadata: { acceptanceId, reason: rejectionReason, name: snap?.entityName, vendor: snap?.vendor?.name },
  })

  return updated
}

async function assertNoApprovalConflict(
  orgId: string,
  entityType: AcceptanceEntityType,
  entityId: string,
  actorId: string,
): Promise<void> {
  // For PARTIDA: check the approved quote's approval request
  if (entityType === "PARTIDA") {
    const partida = await prisma.projectPartida.findUnique({ where: { id: entityId } })
    if (!partida?.approvedQuoteId) return
    const ar = await prisma.approvalRequest.findFirst({
      where: {
        organizationId: orgId,
        entityType: "PROJECT_PARTIDA",
        entityId,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
    })
    if (!ar) return
    if (ar.approvedById === actorId || ar.cosignerId === actorId || ar.requestedById === actorId) {
      throw new Error("Conflicto de interés: aprobaste o cofirmaste la cotización de este servicio")
    }
  }
  if (entityType === "TICKET") {
    const ar = await prisma.approvalRequest.findFirst({
      where: {
        organizationId: orgId,
        entityType: "TICKET",
        entityId,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
    })
    if (!ar) return
    if (ar.approvedById === actorId || ar.cosignerId === actorId || ar.requestedById === actorId) {
      throw new Error("Conflicto de interés: aprobaste o cofirmaste la cotización de este servicio")
    }
  }
}

export async function canUserAcceptThis(
  orgId: string,
  acceptanceId: string,
  userId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } })
  if (!user) return { ok: false, reason: "Usuario no encontrado" }
  if (!user.canAcceptServices) return { ok: false, reason: "No tienes el permiso 'Puede aceptar servicios'" }
  const acceptance = await prisma.serviceAcceptance.findFirst({ where: { id: acceptanceId, organizationId: orgId } })
  if (!acceptance) return { ok: false, reason: "Aceptación no encontrada" }
  if (acceptance.requestedById === userId) return { ok: false, reason: "Eres quien solicitó la aceptación — no puedes aceptarla tú mismo" }
  try {
    await assertNoApprovalConflict(orgId, acceptance.entityType as AcceptanceEntityType, acceptance.entityId, userId)
  } catch (e) {
    return { ok: false, reason: (e as Error).message }
  }
  return { ok: true }
}
