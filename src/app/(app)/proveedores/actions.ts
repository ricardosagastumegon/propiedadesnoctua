"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { vendorSchema } from "@/lib/schemas/vendor"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

export async function createVendor(formData: FormData) {
  const orgId = await getOrgId()
  const raw = Object.fromEntries(formData)
  const parsed = vendorSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const vendor = await prisma.vendor.create({
    data: { organizationId: orgId, ...parsed.data, email: parsed.data.email || null, rating: parsed.data.rating ?? null },
  })
  revalidatePath("/proveedores")
  redirect(`/proveedores/${vendor.id}`)
}

export async function updateVendor(id: string, formData: FormData) {
  const orgId = await getOrgId()
  const raw = Object.fromEntries(formData)
  const parsed = vendorSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.vendor.updateMany({
    where: { id, organizationId: orgId },
    data: { ...parsed.data, email: parsed.data.email || null, rating: parsed.data.rating ?? null },
  })
  revalidatePath(`/proveedores/${id}`)
  revalidatePath("/proveedores")
  redirect(`/proveedores/${id}`)
}

export async function deleteVendor(id: string) {
  const orgId = await getOrgId()
  await prisma.vendor.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/proveedores")
  redirect("/proveedores")
}

export async function toggleVendorActive(id: string, isActive: boolean) {
  const orgId = await getOrgId()
  await prisma.vendor.updateMany({ where: { id, organizationId: orgId }, data: { isActive } })
  revalidatePath("/proveedores")
  revalidatePath(`/proveedores/${id}`)
}
