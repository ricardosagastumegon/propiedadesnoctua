"use server"
import crypto from "crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { propertySchema } from "@/lib/schemas/property"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logError } from "@/lib/observability"
import { tryGuard, guardAction, ActionForbiddenError } from "@/lib/action-guard"
import { isValidPolygon } from "@/lib/geo"
import { Prisma } from "@prisma/client"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return session.user.organizationId
}

/**
 * Convierte el string JSON del form en el valor JSON para Prisma.
 * "" o inválido → null (borra el polígono). Array válido → guarda.
 */
function parseGallery(value: string | undefined): string[] {
  if (!value || value.trim() === "") return []
  try {
    const arr = JSON.parse(value)
    if (Array.isArray(arr)) return arr.filter((u): u is string => typeof u === "string")
  } catch { /* ignore */ }
  return []
}

function parsePolygon(value: string | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value || value.trim() === "") return Prisma.JsonNull
  try {
    const arr = JSON.parse(value)
    if (isValidPolygon(arr)) return arr as Prisma.InputJsonValue
  } catch { /* ignore */ }
  return Prisma.JsonNull
}

/** Guarda SOLO el contorno (polígono) de la finca — para editar desde el detalle. */
export async function updateFincaPolygon(id: string, polygonJson: string): Promise<{ ok: true } | { error: string }> {
  const g = await tryGuard({ module: "propiedades", action: "edit", propertyId: id })
  if ("error" in g) return { error: typeof g.error === "string" ? g.error : "Sin permiso" }
  await prisma.property.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: { mapPolygon: parsePolygon(polygonJson) },
  })
  revalidatePath(`/propiedades/${id}`)
  revalidatePath("/mapa")
  return { ok: true }
}

export async function createProperty(formData: FormData) {
  const g = await tryGuard({ module: "propiedades", action: "create" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Validar que la organización existe (defense contra JWT stale tras migrate reset)
  const orgExists = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
  if (!orgExists) {
    return { error: `Tu sesión apunta a una organización que ya no existe (id ${orgId.slice(0, 8)}…). Cerrá sesión y volvé a entrar.` }
  }

  const { mapPolygon, galleryUrls, ...d } = parsed.data
  try {
    const property = await prisma.property.create({
      data: {
        organizationId: orgId,
        ...d,
        mapPolygon: parsePolygon(mapPolygon),
        galleryUrls: parseGallery(galleryUrls),
        acquisitionDate: d.acquisitionDate ? new Date(d.acquisitionDate) : null,
      },
    })
    revalidatePath("/propiedades")
    return { redirectTo: `/propiedades/${property.id}` }
  } catch (e) {
    logError(e, { area: "property", orgId, extra: { action: "create", name: d.name } })
    const msg = (e as Error).message
    if (msg.includes("Foreign key constraint")) {
      return { error: "Tu sesión apunta a datos que no existen en la DB. Cerrá sesión y volvé a entrar." }
    }
    if (msg.includes("Unique constraint")) {
      return { error: "Ya existe una propiedad con esos datos clave." }
    }
    return { error: `Error al crear propiedad: ${msg}` }
  }
}

export async function updateProperty(id: string, formData: FormData) {
  const g = await tryGuard({ module: "propiedades", action: "edit", propertyId: id })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { mapPolygon, galleryUrls, ...d } = parsed.data
  await prisma.property.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...d,
      mapPolygon: parsePolygon(mapPolygon),
      galleryUrls: parseGallery(galleryUrls),
      acquisitionDate: d.acquisitionDate ? new Date(d.acquisitionDate) : null,
    },
  })
  revalidatePath("/propiedades")
  revalidatePath(`/propiedades/${id}`)
  revalidatePath("/mapa")
  return { redirectTo: `/propiedades/${id}` }
}

export async function deleteProperty(id: string) {
  // Lanza si no tiene permiso (esta action redirige, no devuelve estructura de error)
  await guardAction({ module: "propiedades", action: "delete", propertyId: id })
  const orgId = await getOrgId()
  await prisma.property.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/propiedades")
  redirect("/propiedades")
}

export async function updatePropertyImage(id: string, url: string) {
  try {
    await guardAction({ module: "propiedades", action: "edit", propertyId: id })
  } catch (e) {
    if (e instanceof ActionForbiddenError) return { error: e.message }
    throw e
  }
  const orgId = await getOrgId()
  await prisma.property.updateMany({
    where: { id, organizationId: orgId },
    data: { coverImageUrl: url },
  })
  revalidatePath(`/propiedades/${id}`)
}

/**
 * Activa el link público de una propiedad (genera token si no tiene) y lo
 * devuelve. Solo quien pueda editar la propiedad.
 */
export async function enablePublicShare(id: string) {
  const g = await tryGuard({ module: "propiedades", action: "edit", propertyId: id })
  if ("error" in g) return { error: g.error }

  const prop = await prisma.property.findFirst({
    where: { id, organizationId: g.user.organizationId },
    select: { publicShareToken: true },
  })
  if (!prop) return { error: "Propiedad no encontrada" }

  let token = prop.publicShareToken
  if (!token) {
    token = crypto.randomBytes(9).toString("base64url") // ~12 chars URL-safe
    await prisma.property.update({ where: { id }, data: { publicShareToken: token } })
  }
  revalidatePath(`/propiedades/${id}`)
  return { ok: true, token }
}

/** Revoca el link público (el link deja de funcionar). */
export async function disablePublicShare(id: string) {
  const g = await tryGuard({ module: "propiedades", action: "edit", propertyId: id })
  if ("error" in g) return { error: g.error }
  await prisma.property.updateMany({
    where: { id, organizationId: g.user.organizationId },
    data: { publicShareToken: null },
  })
  revalidatePath(`/propiedades/${id}`)
  return { ok: true }
}
