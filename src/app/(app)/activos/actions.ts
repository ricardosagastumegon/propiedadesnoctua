"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { assetSchema, serviceLogSchema } from "@/lib/schemas/asset"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

export async function createAsset(formData: FormData) {
  const orgId = await getOrgId()
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
  redirect(`/activos/${asset.id}`)
}

export async function updateAsset(id: string, formData: FormData) {
  const orgId = await getOrgId()
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
  redirect(`/activos/${id}`)
}

export async function deleteAsset(id: string) {
  const orgId = await getOrgId()
  await prisma.asset.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/activos")
  redirect("/activos")
}

export async function createServiceLog(assetId: string, formData: FormData) {
  const orgId = await getOrgId()
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
  await prisma.assetServiceLog.delete({ where: { id } })
  revalidatePath(`/activos/${assetId}`)
}
