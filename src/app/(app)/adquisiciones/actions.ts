"use server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { tryGuard } from "@/lib/action-guard"
import { sendAcquisitionEmail, isEmailConfigured } from "@/lib/email"
import { isValidPolygon, centroid, type LatLng } from "@/lib/geo"
import { sanitizeCategories } from "@/lib/acquisition-categories"

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

  let gallery: string[] = []
  try {
    const raw = str(formData.get("galleryUrls"))
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) gallery = arr.filter((u): u is string => typeof u === "string").slice(0, 12) }
  } catch { /* ignore */ }

  // Documentos de municipalidad (plano/escritura)
  let documents: string[] = []
  try {
    const raw = str(formData.get("documentUrls"))
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) documents = arr.filter((u): u is string => typeof u === "string").slice(0, 12) }
  } catch { /* ignore */ }

  // Ubicación obligatoria: catastro O polígono/coordenadas O documentos de municipalidad
  if (!cadastralNumber && !hasLocation && documents.length === 0) {
    return { error: "Falta la ubicación: poné el catastro, dibujá el polígono en el mapa, o subí los documentos de la municipalidad." }
  }

  let categories: string[] = []
  try { const raw = str(formData.get("categories")); if (raw) categories = sanitizeCategories(JSON.parse(raw)) } catch { /* ignore */ }

  const candidate = await prisma.acquisitionCandidate.create({
    data: {
      organizationId: orgId,
      linkId: link.id,
      title,
      categories,
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
      areaUnit: str(formData.get("areaUnit")) || "M2",
      description: str(formData.get("description")),
      galleryUrls: gallery,
      documentUrls: documents,
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
      // Motor de análisis por v²
      area: num(formData.get("area")),
      areaUnit: str(formData.get("areaUnit")),
      cuerdaVaras: int(formData.get("cuerdaVaras")),
      refPriceMinV2: num(formData.get("refPriceMinV2")),
      refPriceMaxV2: num(formData.get("refPriceMaxV2")),
      isCommercial: str(formData.get("isCommercial")) === "true",
      offerPerV2: num(formData.get("offerPerV2")),
    },
  })
  revalidatePath(`/adquisiciones/${id}`)
  return { ok: true }
}

/** Tipo de cambio USD→GTQ configurable del tenant. */
export async function updateFx(fx: number): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const v = fx > 0 && fx < 100 ? fx : 7.5
  await prisma.organizationSettings.upsert({
    where: { organizationId: g.user.organizationId },
    update: { fxUsdGtq: v }, create: { organizationId: g.user.organizationId, fxUsdGtq: v },
  })
  revalidatePath("/adquisiciones")
  return { ok: true }
}

// Parseo común de los campos de una propiedad (para agregar manual / editar).
function parsePropertyData(formData: FormData) {
  let polygon: LatLng[] | null = null
  try { const raw = str(formData.get("mapPolygon")); if (raw) { const arr = JSON.parse(raw); if (isValidPolygon(arr)) polygon = arr as LatLng[] } } catch { /* */ }
  let latitude = num(formData.get("latitude"))
  let longitude = num(formData.get("longitude"))
  if (polygon && (latitude == null || longitude == null)) { const c = centroid(polygon); if (c) { latitude = c[0]; longitude = c[1] } }
  const arr = (key: string) => { try { const raw = str(formData.get(key)); if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a.filter((u): u is string => typeof u === "string").slice(0, 12) } } catch { /* */ } return [] as string[] }
  let categories: string[] = []
  try { const raw = str(formData.get("categories")); if (raw) categories = sanitizeCategories(JSON.parse(raw)) } catch { /* */ }
  return {
    title: str(formData.get("title")),
    categories,
    propertyType: str(formData.get("propertyType")),
    department: str(formData.get("department")),
    city: str(formData.get("city")),
    zone: str(formData.get("zone")),
    addressLine: str(formData.get("addressLine")),
    cadastralNumber: str(formData.get("cadastralNumber")),
    price: num(formData.get("price")),
    currency: str(formData.get("currency")) || "GTQ",
    bedrooms: int(formData.get("bedrooms")),
    bathrooms: int(formData.get("bathrooms")),
    area: num(formData.get("area")),
    areaUnit: str(formData.get("areaUnit")),
    cuerdaVaras: int(formData.get("cuerdaVaras")),
    description: str(formData.get("description")),
    mapPolygon: polygon, latitude, longitude,
    gallery: arr("galleryUrls"), documents: arr("documentUrls"),
  }
}

/** El tenant agrega una propiedad manualmente a Adquisiciones. */
export async function createCandidateManual(formData: FormData): Promise<{ redirectTo: string } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const d = parsePropertyData(formData)
  if (!d.title) return { error: "Poné al menos el título/nombre de la propiedad." }
  const c = await prisma.acquisitionCandidate.create({
    data: {
      organizationId: g.user.organizationId, source: "MANUAL", stage: "NEW",
      title: d.title, categories: d.categories, propertyType: d.propertyType, department: d.department, city: d.city, zone: d.zone,
      addressLine: d.addressLine, cadastralNumber: d.cadastralNumber, price: d.price, currency: d.currency,
      bedrooms: d.bedrooms, bathrooms: d.bathrooms, area: d.area, areaUnit: d.areaUnit, cuerdaVaras: d.cuerdaVaras,
      description: d.description, galleryUrls: d.gallery, documentUrls: d.documents,
      mapPolygon: d.mapPolygon ?? undefined, latitude: d.latitude, longitude: d.longitude,
    },
  })
  revalidatePath("/adquisiciones")
  return { redirectTo: `/adquisiciones/${c.id}` }
}

/** Editar la información de una propiedad (dueño). */
export async function updateCandidateInfo(id: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const d = parsePropertyData(formData)
  if (!d.title) return { error: "Poné al menos el título/nombre." }
  const res = await prisma.acquisitionCandidate.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: {
      title: d.title, categories: d.categories, propertyType: d.propertyType, department: d.department, city: d.city, zone: d.zone,
      addressLine: d.addressLine, cadastralNumber: d.cadastralNumber, price: d.price, currency: d.currency,
      bedrooms: d.bedrooms, bathrooms: d.bathrooms, area: d.area, areaUnit: d.areaUnit, cuerdaVaras: d.cuerdaVaras,
      description: d.description, galleryUrls: d.gallery, documentUrls: d.documents,
      mapPolygon: d.mapPolygon ?? Prisma.JsonNull, latitude: d.latitude, longitude: d.longitude,
    },
  })
  if (res.count === 0) return { error: "No encontrada" }
  revalidatePath(`/adquisiciones/${id}`)
  return { ok: true }
}

/** Agrega un movimiento de negociación (pidieron/ofrecí/reofertaron). */
export async function addNegotiation(candidateId: string, formData: FormData): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const own = await prisma.acquisitionCandidate.findFirst({ where: { id: candidateId, organizationId: g.user.organizationId }, select: { id: true } })
  if (!own) return { error: "No encontrada" }
  const amount = num(formData.get("amount"))
  if (amount == null) return { error: "Poné el monto." }
  await prisma.acquisitionNegotiation.create({
    data: {
      candidateId, organizationId: g.user.organizationId,
      kind: str(formData.get("kind")) || "OTHER", amount,
      currency: str(formData.get("currency")) || "GTQ", note: str(formData.get("note")),
    },
  })
  revalidatePath(`/adquisiciones/${candidateId}`)
  return { ok: true }
}

/** Elimina un movimiento de negociación. */
export async function deleteNegotiation(id: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  await prisma.acquisitionNegotiation.deleteMany({ where: { id, organizationId: g.user.organizationId } })
  return { ok: true }
}

/** ¿El tenant tiene habilitado el módulo de Puntos de Interés? (gate del super-admin). */
async function requirePoiEnabled(orgId: string): Promise<boolean> {
  const s = await prisma.organizationSettings.findUnique({ where: { organizationId: orgId }, select: { poiEnabled: true } })
  return !!s?.poiEnabled
}

/** Crea un punto de interés (ej. gasolinera). */
export async function createPoi(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  if (!(await requirePoiEnabled(g.user.organizationId))) return { error: "Los puntos de interés no están habilitados para tu organización." }
  const name = str(formData.get("name"))
  if (!name) return { error: "Poné un nombre." }
  await prisma.pointOfInterest.create({
    data: {
      organizationId: g.user.organizationId, name,
      category: str(formData.get("category")), municipality: str(formData.get("municipality")),
      department: str(formData.get("department")), zone: str(formData.get("zone")), address: str(formData.get("address")),
      latitude: num(formData.get("latitude")), longitude: num(formData.get("longitude")), notes: str(formData.get("notes")),
    },
  })
  revalidatePath("/adquisiciones/puntos"); revalidatePath("/adquisiciones/mapa")
  return { ok: true }
}

/** Elimina un punto de interés. */
export async function deletePoi(id: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  await prisma.pointOfInterest.deleteMany({ where: { id, organizationId: g.user.organizationId } })
  revalidatePath("/adquisiciones/puntos"); revalidatePath("/adquisiciones/mapa")
  return { ok: true }
}

/** Importa puntos pegados (detecta lat/lng en cada línea). */
export async function importPois(text: string, category: string): Promise<{ ok: true; count: number } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  if (!(await requirePoiEnabled(g.user.organizationId))) return { error: "Los puntos de interés no están habilitados para tu organización." }
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const data: { organizationId: string; name: string; category: string | null; latitude: number; longitude: number; municipality: string | null }[] = []
  let i = 0
  for (const line of lines) {
    // Buscar dos números tipo lat/lng (GT: lat 13–18, lng -93 a -88)
    const nums = (line.match(/-?\d+\.\d+/g) || []).map(Number)
    let lat: number | null = null, lng: number | null = null
    for (let k = 0; k < nums.length - 1; k++) {
      const a = nums[k], b = nums[k + 1]
      if (a > 13 && a < 18 && b < -87 && b > -93) { lat = a; lng = b; break }
    }
    if (lat == null || lng == null) continue
    // texto restante (sin números) → nombre / municipio
    const rest = line.replace(/-?\d+\.\d+/g, "").replace(/[,;|\t]+/g, " ").trim()
    i++
    data.push({ organizationId: g.user.organizationId, name: rest || `Punto ${i}`, category: category.trim() || null, latitude: lat, longitude: lng, municipality: rest || null })
  }
  if (data.length === 0) return { error: "No se detectaron coordenadas. Cada línea debe traer lat y lng (ej. 14.5803, -90.5221)." }
  await prisma.pointOfInterest.createMany({ data })
  revalidatePath("/adquisiciones/puntos"); revalidatePath("/adquisiciones/mapa")
  return { ok: true, count: data.length }
}

/**
 * "Enviar a": reenvía una candidata propia a otro tenant (receiver). Crea una COPIA
 * en el tenant destino, marcada con el origen (submittedByOrg = mi tenant) para
 * mantener la trazabilidad. Solo si el super-admin autorizó ese envío.
 */
export async function forwardCandidate(candidateId: string, receiverOrgId: string): Promise<{ ok: true; name: string; already?: boolean } | { error: string }> {
  const g = await tryGuard({ module: "adquisiciones", action: "edit" })
  if ("error" in g) return { error: g.error }
  const me = g.user.organizationId
  if (receiverOrgId === me) return { error: "No podés reenviarte a vos mismo." }

  // ¿Estoy autorizado a enviarle a ese tenant?
  const perm = await prisma.acquisitionForwardPermission.findUnique({
    where: { senderOrgId_receiverOrgId: { senderOrgId: me, receiverOrgId } },
    select: { id: true, receiver: { select: { name: true } } },
  })
  if (!perm) return { error: "No estás autorizado a enviarle propiedades a ese tenant. Pedile al administrador de Noctua que lo habilite." }

  // La candidata debe ser MÍA y ORIGINADA por mí (pública/manual). Las que ya me
  // reenviaron (submittedByOrgId != null) NO se pueden re-reenviar: el reenvío es
  // de un solo salto para no romper la trazabilidad ni propagar el contacto original.
  const c = await prisma.acquisitionCandidate.findFirst({ where: { id: candidateId, organizationId: me, submittedByOrgId: null } })
  if (!c) return { error: "Propiedad no encontrada, o es una que te reenviaron (no se puede reenviar de nuevo)." }

  // Evitar duplicados: si ya la reenvié a ese tenant, no crear otra.
  const dup = await prisma.acquisitionCandidate.findFirst({
    where: { organizationId: receiverOrgId, sourceCandidateId: c.id },
    select: { id: true },
  })
  if (dup) return { ok: true, name: perm.receiver.name, already: true }

  let created
  try {
    created = await prisma.acquisitionCandidate.create({
      data: {
        organizationId: receiverOrgId,
        submittedByOrgId: me,
        sourceCandidateId: c.id,
        source: "FORWARDED",
        stage: "NEW",
        title: c.title,
        categories: c.categories,
        propertyType: c.propertyType,
        department: c.department, city: c.city, zone: c.zone, addressLine: c.addressLine,
        cadastralNumber: c.cadastralNumber,
        mapPolygon: c.mapPolygon ?? undefined,
        latitude: c.latitude, longitude: c.longitude,
        price: c.price, currency: c.currency,
        bedrooms: c.bedrooms, bathrooms: c.bathrooms,
        area: c.area, areaUnit: c.areaUnit, cuerdaVaras: c.cuerdaVaras,
        description: c.description,
        galleryUrls: c.galleryUrls, documentUrls: c.documentUrls,
        agentName: c.agentName, agentPhone: c.agentPhone, agentEmail: c.agentEmail,
      },
    })
  } catch (e) {
    // Backstop de carrera: doble envío simultáneo choca con el índice único
    // (organizationId, sourceCandidateId) → tratarlo como "ya enviada".
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: true, name: perm.receiver.name, already: true }
    }
    throw e
  }

  // Notificar al tenant destino (campana + email).
  try {
    const sender = await prisma.organization.findUnique({ where: { id: me }, select: { name: true } })
    const users = await prisma.user.findMany({
      where: { organizationId: receiverOrgId, isActive: true, role: { in: ["OWNER", "ADMIN", "MANAGER"] } },
      select: { id: true, email: true },
    })
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map(u => ({
          organizationId: receiverOrgId, userId: u.id, type: "ACQUISITION",
          title: "Propiedad reenviada",
          message: `${sender?.name ?? "Un socio"} te envió: ${c.title}`,
          link: `/adquisiciones/${created.id}`,
        })),
      })
      if (isEmailConfigured()) {
        const url = `${APP_URL}/adquisiciones/${created.id}`
        await Promise.all(users.filter(u => u.email).map(u =>
          sendAcquisitionEmail(u.email!, c.title, sender?.name ?? null, url).catch(() => {})
        ))
      }
    }
  } catch { /* no romper el reenvío por fallar la notificación */ }

  revalidatePath("/adquisiciones")
  revalidatePath(`/adquisiciones/${candidateId}`)
  return { ok: true, name: perm.receiver.name }
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
