"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  requestServiceAcceptance as libRequest,
  acceptService as libAccept,
  rejectServiceAcceptance as libReject,
  type AcceptanceEntityType,
} from "@/lib/service-acceptance"
import { logError } from "@/lib/observability"

async function getSession() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  const orgId = session.user.organizationId
  const userId = session.user.id
  const actorName = session.user.name ?? "Usuario"
  return { orgId, userId, actorName }
}

export async function requestAcceptance(entityType: AcceptanceEntityType, entityId: string) {
  const { orgId, userId, actorName } = await getSession()
  const acceptance = await libRequest({
    orgId,
    entityType,
    entityId,
    requestedById: userId,
    requestedByName: actorName,
  })
  revalidatePath("/aceptaciones")
  if (entityType === "PARTIDA") {
    const p = await prisma.projectPartida.findUnique({ where: { id: entityId } })
    if (p) revalidatePath(`/proyectos/${p.projectId}`)
  } else {
    revalidatePath(`/mantenimiento/${entityId}`)
  }
  return { acceptanceId: acceptance.id }
}

export async function acceptServiceAction(formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const acceptanceId = formData.get("acceptanceId") as string
  const rating = parseInt(formData.get("rating") as string, 10) || 0
  const notes = (formData.get("notes") as string) || null
  const checklistRaw = (formData.get("checklist") as string) || "[]"
  const photosRaw = (formData.get("photos") as string) || "[]"

  let checklist: { key: string; checked: boolean }[] = []
  let photos: { url: string; caption?: string | null }[] = []
  try { checklist = JSON.parse(checklistRaw) } catch { return { error: "Checklist inválido" } }
  try { photos = JSON.parse(photosRaw) } catch { return { error: "Fotos inválidas" } }

  try {
    const accepted = await libAccept({ orgId, acceptanceId, actorId: userId, actorName, checklist, rating, notes, photos })
    revalidatePath("/aceptaciones")
    revalidatePath(`/aceptaciones/${acceptanceId}`)
    if (accepted.entityType === "PARTIDA") {
      const p = await prisma.projectPartida.findUnique({ where: { id: accepted.entityId } })
      if (p) revalidatePath(`/proyectos/${p.projectId}`)
    } else {
      revalidatePath(`/mantenimiento/${accepted.entityId}`)
    }
    return { ok: true }
  } catch (e) {
    logError(e, { area: "acceptance", orgId, userId, extra: { acceptanceId, action: "accept" } })
    return { error: (e as Error).message }
  }
}

export async function rejectServiceAction(formData: FormData) {
  const { orgId, userId, actorName } = await getSession()
  const acceptanceId = formData.get("acceptanceId") as string
  const rejectionReason = (formData.get("rejectionReason") as string) || ""
  const requiredCorrections = (formData.get("requiredCorrections") as string) || null

  try {
    const rejected = await libReject({ orgId, acceptanceId, actorId: userId, actorName, rejectionReason, requiredCorrections })
    revalidatePath("/aceptaciones")
    revalidatePath(`/aceptaciones/${acceptanceId}`)
    if (rejected.entityType === "PARTIDA") {
      const p = await prisma.projectPartida.findUnique({ where: { id: rejected.entityId } })
      if (p) revalidatePath(`/proyectos/${p.projectId}`)
    } else {
      revalidatePath(`/mantenimiento/${rejected.entityId}`)
    }
    return { ok: true }
  } catch (e) {
    logError(e, { area: "acceptance", orgId, userId, extra: { acceptanceId, action: "reject" } })
    return { error: (e as Error).message }
  }
}

export async function navigateToAcceptance(id: string) {
  redirect(`/aceptaciones/${id}`)
}
