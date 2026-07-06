"use server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { tryGuard } from "@/lib/action-guard"
import { sendAcquisitionEmail, isEmailConfigured } from "@/lib/email"

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

/** Genera (o devuelve) el token del link público de la org. Solo con permiso de edición. */
export async function getOrCreateAcquisitionToken(): Promise<{ token: string } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId
  const existing = await prisma.organizationSettings.findUnique({
    where: { organizationId: orgId }, select: { acquisitionToken: true },
  })
  if (existing?.acquisitionToken) return { token: existing.acquisitionToken }
  const token = crypto.randomBytes(12).toString("base64url")
  await prisma.organizationSettings.upsert({
    where: { organizationId: orgId },
    update: { acquisitionToken: token },
    create: { organizationId: orgId, acquisitionToken: token },
  })
  revalidatePath("/adquisiciones")
  return { token }
}

/** Regenera el token (invalida el link viejo). */
export async function regenerateAcquisitionToken(): Promise<{ token: string } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const token = crypto.randomBytes(12).toString("base64url")
  await prisma.organizationSettings.upsert({
    where: { organizationId: g.user.organizationId },
    update: { acquisitionToken: token },
    create: { organizationId: g.user.organizationId, acquisitionToken: token },
  })
  revalidatePath("/adquisiciones")
  return { token }
}

/**
 * PÚBLICA (sin login): un agente externo envía una propiedad vía el token del tenant.
 * Valida el token, crea la candidata, notifica (campana + email) al tenant.
 */
export async function submitAcquisition(token: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  // Honeypot anti-spam: si el campo oculto viene lleno, es un bot.
  if (str(formData.get("website"))) return { ok: true }

  if (!token) return { error: "Link inválido" }
  const settings = await prisma.organizationSettings.findUnique({
    where: { acquisitionToken: token },
    select: { organizationId: true },
  })
  if (!settings) return { error: "Este link no es válido o fue desactivado." }
  const orgId = settings.organizationId

  const title = str(formData.get("title"))
  if (!title) return { error: "Escribí al menos el título/nombre de la propiedad." }

  let gallery: string[] = []
  try {
    const raw = str(formData.get("galleryUrls"))
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) gallery = arr.filter((u): u is string => typeof u === "string").slice(0, 12) }
  } catch { /* ignore */ }

  const candidate = await prisma.acquisitionCandidate.create({
    data: {
      organizationId: orgId,
      title,
      propertyType: str(formData.get("propertyType")),
      department: str(formData.get("department")),
      city: str(formData.get("city")),
      zone: str(formData.get("zone")),
      addressLine: str(formData.get("addressLine")),
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
