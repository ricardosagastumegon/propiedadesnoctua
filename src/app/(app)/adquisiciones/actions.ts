"use server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { tryGuard } from "@/lib/action-guard"
import { sendAcquisitionEmail, isEmailConfigured } from "@/lib/email"
import { isValidPolygon, centroid, type LatLng } from "@/lib/geo"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.noctuapo.com"
const STAGES = ["NEW", "OFFERED", "ACCEPTED", "DISCARDED"] as const

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || String(v).trim() === "") return null
  const n = parseFloat(String(v))
  return isNaN(n) ? null : n
}
function int(v: FormDataEntryValue | null): number | null {
  const n = num(v)
  return n == null ? null : Math.round(n)
}
function str(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim()
  return s === "" ? null : s
}

function newToken() { return crypto.randomBytes(12).toString("base64url") }

/** Crea un link nuevo (con su token) para la org. Solo el dueño (con permiso edit). */
export async function createAcquisitionLink(name: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  await prisma.acquisitionLink.create({
    data: { organizationId: g.user.organizationId, token: newToken(), name: name.trim().slice(0, 60) || "Link" },
  })
  revalidatePath("/adquisiciones")
  return { ok: true }
}

/** Edita nombre y/o requerimiento (brief) de un link propio. */
export async function updateAcquisitionLink(id: string, data: { name?: string; brief?: string }): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const res = await prisma.acquisitionLink.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: {
      ...(data.name != null ? { name: data.name.trim().slice(0, 60) || "Link" } : {}),
      ...(data.brief != null ? { brief: data.brief.trim().slice(0, 1000) || null } : {}),
    },
  })
  if (res.count === 0) return { error: "Link no encontrado" }
  revalidatePath("/adquisiciones")
  return { ok: true }
}

/** Regenera el token de un link (invalida el anterior). */
export async function regenerateLinkToken(id: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const res = await prisma.acquisitionLink.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: { token: newToken() },
  })
  if (res.count === 0) return { error: "Link no encontrado" }
  revalidatePath("/adquisiciones")
  return { ok: true }
}

/** Elimina un link (las propiedades quedan, sin link). */
export async function deleteAcquisitionLink(id: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  await prisma.acquisitionLink.deleteMany({ where: { id, organizationId: g.user.organizationId } })
  revalidatePath("/adquisiciones")
  return { ok: true }
}

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sin O/0/I/1 ambiguos
  const b = crypto.randomBytes(8)
  let s = ""
  for (let i = 0; i < 8; i++) s += alphabet[b[i] % alphabet.length]
  return s
}

/** Devuelve (creando si falta) el código de intermediario de MI tenant, para compartir. */
export async function getMyIntermediaryCode(): Promise<{ code: string } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "view" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId
  const existing = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId }, select: { intermediaryCode: true },
  })
  if (existing?.intermediaryCode) return { code: existing.intermediaryCode }
  // generar único con reintentos
  for (let i = 0; i < 6; i++) {
    const code = genCode()
    try {
      await prisma.organizationSettings.upsert({
        where: { organizationId: orgId },
        update: { intermediaryCode: code },
        create: { organizationId: orgId, intermediaryCode: code },
      })
      revalidatePath("/adquisiciones")
      return { code }
    } catch { /* colisión, reintentar */ }
  }
  return { error: "No se pudo generar el código, intentá de nuevo." }
}

/** El dueño A asigna un intermediario a SU link, pegando el código que le pasó B. */
export async function setLinkIntermediaryByCode(linkId: string, code: string): Promise<{ ok: true; name: string } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const clean = code.trim().toUpperCase()
  if (!clean) return { error: "Pegá el código del intermediario." }
  const target = await prisma.organizationSettings.findUnique({
    where: { intermediaryCode: clean },
    select: { organizationId: true, organization: { select: { name: true } } },
  })
  if (!target) return { error: "Código no válido. Pedile a tu intermediario que te pase su código actual." }
  if (target.organizationId === g.user.organizationId) return { error: "Ese es tu propio código." }
  const res = await prisma.acquisitionLink.updateMany({
    where: { id: linkId, organizationId: g.user.organizationId },
    data: { intermediaryOrgId: target.organizationId },
  })
  if (res.count === 0) return { error: "Link no encontrado" }
  revalidatePath("/adquisiciones")
  return { ok: true, name: target.organization.name }
}

/** Quita el intermediario de un link propio. */
export async function removeLinkIntermediary(linkId: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  await prisma.acquisitionLink.updateMany({
    where: { id: linkId, organizationId: g.user.organizationId },
    data: { intermediaryOrgId: null },
  })
  revalidatePath("/adquisiciones")
  return { ok: true }
}

/**
 * PÚBLICA (sin login): un agente externo envía una propiedad vía el token del tenant.
 * Valida el token, crea la candidata, notifica (campana + email) al tenant.
 */
export async function submitAcquisition(token: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  // Honeypot anti-spam: si el campo oculto viene lleno, es un bot.
  if (str(formData.get("website"))) return { ok: true }

  if (!token) return { error: "Link inválido" }
  const link = await prisma.acquisitionLink.findUnique({
    where: { token },
    select: { id: true, organizationId: true, isActive: true },
  })
  if (!link || !link.isActive) return { error: "Este link no es válido o fue desactivado." }
  const orgId = link.organizationId

  const title = str(formData.get("title"))
  if (!title) return { error: "Escribí al menos el título/nombre de la propiedad." }

  // Catastro O ubicación en el mapa (al menos uno)
  const cadastralNumber = str(formData.get("cadastralNumber"))
  let polygon: LatLng[] | null = null
  try {
    const raw = str(formData.get("mapPolygon"))
    if (raw) { const arr = JSON.parse(raw); if (isValidPolygon(arr)) polygon = arr as LatLng[] }
  } catch { /* ignore */ }
  let latitude = num(formData.get("latitude"))
  let longitude = num(formData.get("longitude"))
  if (polygon && (latitude == null || longitude == null)) {
    const c = centroid(polygon)
    if (c) { latitude = c[0]; longitude = c[1] }
  }
  const hasLocation = polygon != null || (latitude != null && longitude != null)
  if (!cadastralNumber && !hasLocation) {
    return { error: "Agregá el número de catastro o marcá la ubicación en el mapa (al menos uno)." }
  }

  let gallery: string[] = []
  try {
    const raw = str(formData.get("galleryUrls"))
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) gallery = arr.filter((u): u is string => typeof u === "string").slice(0, 12) }
  } catch { /* ignore */ }

  const candidate = await prisma.acquisitionCandidate.create({
    data: {
      organizationId: orgId,
      linkId: link.id,
      title,
      propertyType: str(formData.get("propertyType")),
      department: str(formData.get("department")),
      city: str(formData.get("city")),
      zone: str(formData.get("zone")),
      addressLine: str(formData.get("addressLine")),
      cadastralNumber,
      mapPolygon: polygon ?? undefined,
      latitude,
      longitude,
      price: num(formData.get("price")),
      currency: str(formData.get("currency")) || "GTQ",
      bedrooms: int(formData.get("bedrooms")),
      bathrooms: int(formData.get("bathrooms")),
      area: num(formData.get("area")),
      description: str(formData.get("description")),
      galleryUrls: gallery,
      agentName: str(formData.get("agentName")),
      agentPhone: str(formData.get("agentPhone")),
      agentEmail: str(formData.get("agentEmail")),
    },
  })

  // Notificar a los usuarios de la org que pueden ver adquisiciones (campana).
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true, role: { in: ["OWNER", "ADMIN", "MANAGER"] } },
      select: { id: true, email: true },
    })
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map(u => ({
          organizationId: orgId, userId: u.id, type: "ACQUISITION",
          title: "Nueva propiedad recibida",
          message: `${candidate.agentName ? candidate.agentName + " envió" : "Recibiste"}: ${title}`,
          link: `/adquisiciones/${candidate.id}`,
        })),
      })
      // Email (si Resend está configurado)
      if (isEmailConfigured()) {
        const link = `${APP_URL}/adquisiciones/${candidate.id}`
        await Promise.all(users.filter(u => u.email).map(u =>
          sendAcquisitionEmail(u.email!, title, candidate.agentName, link).catch(() => {})
        ))
      }
    }
  } catch { /* no romper el envío del agente por fallar la notificación */ }

  return { ok: true }
}

/** Cambia la etapa de una candidata. */
export async function updateCandidateStage(id: string, stage: string): Promise<{ ok: true } | { error: string }> {
  if (!(STAGES as readonly string[]).includes(stage)) return { error: "Etapa inválida" }
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  await prisma.acquisitionCandidate.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: { stage },
  })
  revalidatePath("/adquisiciones")
  revalidatePath(`/adquisiciones/${id}`)
  return { ok: true }
}

/** Guarda el análisis del cliente (notas, valor estimado, oferta). */
export async function updateCandidateAnalysis(id: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  await prisma.acquisitionCandidate.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: {
      analysisNotes: str(formData.get("analysisNotes")),
      estimatedValue: num(formData.get("estimatedValue")),
      offerAmount: num(formData.get("offerAmount")),
    },
  })
  revalidatePath(`/adquisiciones/${id}`)
  return { ok: true }
}

/** Elimina una candidata. */
export async function deleteCandidate(id: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "delete" })
  if ("error" in g) return { error: g.error }
  await prisma.acquisitionCandidate.deleteMany({
    where: { id, organizationId: g.user.organizationId },
  })
  revalidatePath("/adquisiciones")
  return { ok: true }
}
