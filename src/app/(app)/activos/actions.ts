"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { assetSchema, serviceLogSchema } from "@/lib/schemas/asset"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { tryGuard, guardAction } from "@/lib/action-guard"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return session.user.organizationId
}

async function assetPropertyId(assetId: string): Promise<string | null> {
  const a = await prisma.asset.findUnique({ where: { id: assetId }, select: { propertyId: true } })
  return a?.propertyId ?? null
}

export async function createAsset(formData: FormData) {
  const propertyId = (formData.get("propertyId") as string) || null
  const g = await tryGuard({ module: "activos", action: "create", propertyId })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = assetSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const asset = await prisma.asset.create({
    data: {
      organizationId: orgId,
      ...parsed.data,
      propertyId: parsed.data.propertyId || null,
      purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
      warranty: parsed.data.warranty ? new Date(parsed.data.warranty) : null,
    },
  })
  revalidatePath("/activos")
  return { redirectTo: `/activos/${asset.id}` }
}

export async function updateAsset(id: string, formData: FormData) {
  const propertyId = await assetPropertyId(id)
  const g = await tryGuard({ module: "activos", action: "edit", propertyId })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const raw = Object.fromEntries(formData)
  const parsed = assetSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.asset.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...parsed.data,
      propertyId: parsed.data.propertyId || null,
      purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
      warranty: parsed.data.warranty ? new Date(parsed.data.warranty) : null,
    },
  })
  revalidatePath(`/activos/${id}`)
  revalidatePath("/activos")
  return { redirectTo: `/activos/${id}` }
}

export async function deleteAsset(id: string) {
  const propertyId = await assetPropertyId(id)
  await guardAction({ module: "activos", action: "delete", propertyId })
  const orgId = await getOrgId()
  await prisma.asset.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/activos")
  redirect("/activos")
}

export async function createServiceLog(assetId: string, formData: FormData) {
  const propertyId = await assetPropertyId(assetId)
  const g = await tryGuard({ module: "activos", action: "edit", propertyId })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const asset = await prisma.asset.findFirst({ where: { id: assetId, organizationId: orgId } })
  if (!asset) throw new Error("Activo no encontrado")

  const raw = Object.fromEntries(formData)
  const parsed = serviceLogSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.assetServiceLog.create({
    data: {
      assetId,
      ...parsed.data,
      date: new Date(parsed.data.date),
      nextServiceAt: parsed.data.nextServiceAt ? new Date(parsed.data.nextServiceAt) : null,
    },
  })
  revalidatePath(`/activos/${assetId}`)
}

export async function deleteServiceLog(id: string, assetId: string) {
  const propertyId = await assetPropertyId(assetId)
  const g = await tryGuard({ module: "activos", action: "edit", propertyId })
  if ("error" in g) return
  await prisma.assetServiceLog.delete({ where: { id } })
  revalidatePath(`/activos/${assetId}`)
}

export async function createAssetRecord(assetId: string, formData: FormData) {
  const propertyId = await assetPropertyId(assetId)
  const g = await tryGuard({ module: "activos", action: "edit", propertyId })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

  const asset = await prisma.asset.findFirst({ where: { id: assetId, organizationId: orgId } })
  if (!asset) return { error: "Activo no encontrado" }

  const title = formData.get("title") as string
  const recordTypeId = formData.get("recordTypeId") as string
  const issueDateRaw = formData.get("issueDate") as string
  const expiryDateRaw = formData.get("expiryDate") as string
  const notifyDaysBefore = parseInt(formData.get("notifyDaysBefore") as string) || 30
  const notes = formData.get("notes") as string

  if (!title?.trim()) return { error: "Titulo requerido" }
  if (!recordTypeId?.trim()) return { error: "Tipo requerido" }

  await prisma.assetRecord.create({
    data: {
      assetId,
      recordTypeId,
      title,
      issueDate: issueDateRaw ? new Date(issueDateRaw) : null,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
      notifyDaysBefore,
      notes: notes || null,
    },
  })
  revalidatePath(`/activos/${assetId}`)
}

export async function deleteAssetRecord(recordId: string, assetId: string) {
  const propertyId = await assetPropertyId(assetId)
  const g = await tryGuard({ module: "activos", action: "edit", propertyId })
  if ("error" in g) return
  await prisma.assetRecord.delete({ where: { id: recordId } })
  revalidatePath(`/activos/${assetId}`)
}

export async function ensureDefaultRecordTypes(orgId: string) {
  const defaults = [
    { code: "INSURANCE", name: "Seguro", isSystem: true },
    { code: "REGISTRATION", name: "Matricula / Registro", isSystem: true },
    { code: "LICENSE", name: "Licencia", isSystem: true },
    { code: "INSPECTION", name: "Inspeccion tecnica", isSystem: true },
    { code: "WARRANTY", name: "Garantia", isSystem: true },
    { code: "PERMIT", name: "Permiso de operacion", isSystem: true },
  ]
  for (const d of defaults) {
    await prisma.assetRecordType.upsert({
      where: { organizationId_code: { organizationId: orgId, code: d.code } },
      update: {},
      create: { organizationId: orgId, ...d },
    })
  }
}
