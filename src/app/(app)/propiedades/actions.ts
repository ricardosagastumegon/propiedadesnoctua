"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { propertySchema } from "@/lib/schemas/property"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

export async function createProperty(formData: FormData) {
  const orgId = await getOrgId()
  const raw = Object.fromEntries(formData)
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const d = parsed.data
  const property = await prisma.property.create({
    data: {
      organizationId: orgId,
      ...d,
      acquisitionDate: d.acquisitionDate ? new Date(d.acquisitionDate) : null,
    },
  })
  revalidatePath("/propiedades")
  return { redirectTo: `/propiedades/${property.id}` }
}

export async function updateProperty(id: string, formData: FormData) {
  const orgId = await getOrgId()
  const raw = Object.fromEntries(formData)
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const d = parsed.data
  await prisma.property.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...d,
      acquisitionDate: d.acquisitionDate ? new Date(d.acquisitionDate) : null,
    },
  })
  revalidatePath("/propiedades")
  revalidatePath(`/propiedades/${id}`)
  return { redirectTo: `/propiedades/${id}` }
}

export async function deleteProperty(id: string) {
  const orgId = await getOrgId()
  await prisma.property.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/propiedades")
  redirect("/propiedades")
}

export async function updatePropertyImage(id: string, url: string) {
  const orgId = await getOrgId()
  await prisma.property.updateMany({
    where: { id, organizationId: orgId },
    data: { coverImageUrl: url },
  })
  revalidatePath(`/propiedades/${id}`)
}
