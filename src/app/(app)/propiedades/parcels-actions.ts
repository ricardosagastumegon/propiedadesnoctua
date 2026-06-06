"use server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { tryGuard, guardAction } from "@/lib/action-guard"
import { isValidPolygon, polygonAreaHectares } from "@/lib/geo"

function parsePolygon(value: string | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (!value || value.trim() === "") return Prisma.JsonNull
  try {
    const arr = JSON.parse(value)
    if (isValidPolygon(arr)) return arr as Prisma.InputJsonValue
  } catch { /* ignore */ }
  return Prisma.JsonNull
}

function areaFrom(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null
  try {
    const arr = JSON.parse(value)
    if (isValidPolygon(arr)) return Math.round(polygonAreaHectares(arr) * 10000) / 10000
  } catch { /* ignore */ }
  return null
}

/** Crea un predio dentro de una finca. */
export async function createParcel(propertyId: string, formData: FormData) {
  const g = await tryGuard({ module: "propiedades", action: "edit", propertyId })
  if ("error" in g) return { error: g.error }

  // Confirmar que la finca pertenece a la org del usuario
  const prop = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: g.user.organizationId },
    select: { id: true },
  })
  if (!prop) return { error: "Finca no encontrada" }

  const name = (formData.get("name") as string)?.trim() || null
  const cadastralNumber = (formData.get("cadastralNumber") as string)?.trim() || null
  const notes = (formData.get("notes") as string)?.trim() || null
  const polygonRaw = formData.get("mapPolygon") as string | undefined
  const realRaw = formData.get("realPolygon") as string | undefined

  const maxOrder = await prisma.propertyParcel.aggregate({
    _max: { orderIndex: true }, where: { propertyId },
  })

  await prisma.propertyParcel.create({
    data: {
      propertyId,
      name,
      cadastralNumber,
      notes,
      mapPolygon: parsePolygon(polygonRaw),
      areaHectares: areaFrom(polygonRaw),
      realPolygon: parsePolygon(realRaw),
      realAreaHectares: areaFrom(realRaw),
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  })
  revalidatePath(`/propiedades/${propertyId}`)
  revalidatePath("/mapa")
  return { ok: true }
}

/** Edita un predio. */
export async function updateParcel(parcelId: string, formData: FormData) {
  const parcel = await prisma.propertyParcel.findUnique({
    where: { id: parcelId },
    select: { propertyId: true, property: { select: { organizationId: true } } },
  })
  if (!parcel) return { error: "Predio no encontrado" }

  const g = await tryGuard({ module: "propiedades", action: "edit", propertyId: parcel.propertyId })
  if ("error" in g) return { error: g.error }
  if (parcel.property.organizationId !== g.user.organizationId) return { error: "Sin acceso" }

  const name = (formData.get("name") as string)?.trim() || null
  const cadastralNumber = (formData.get("cadastralNumber") as string)?.trim() || null
  const notes = (formData.get("notes") as string)?.trim() || null
  const polygonRaw = formData.get("mapPolygon") as string | undefined
  const realRaw = formData.get("realPolygon") as string | undefined

  await prisma.propertyParcel.update({
    where: { id: parcelId },
    data: {
      name,
      cadastralNumber,
      notes,
      mapPolygon: parsePolygon(polygonRaw),
      areaHectares: areaFrom(polygonRaw),
      realPolygon: parsePolygon(realRaw),
      realAreaHectares: areaFrom(realRaw),
    },
  })
  revalidatePath(`/propiedades/${parcel.propertyId}`)
  revalidatePath("/mapa")
  return { ok: true }
}

/** Elimina un predio. */
export async function deleteParcel(parcelId: string) {
  const parcel = await prisma.propertyParcel.findUnique({
    where: { id: parcelId },
    select: { propertyId: true, property: { select: { organizationId: true } } },
  })
  if (!parcel) return { error: "Predio no encontrado" }

  const user = await guardAction({ module: "propiedades", action: "edit", propertyId: parcel.propertyId })
  if (parcel.property.organizationId !== user.organizationId) return { error: "Sin acceso" }

  await prisma.propertyParcel.delete({ where: { id: parcelId } })
  revalidatePath(`/propiedades/${parcel.propertyId}`)
  revalidatePath("/mapa")
  return { ok: true }
}
