"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { tenantSchema } from "@/lib/schemas/tenant"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

export async function createTenant(formData: FormData) {
  const orgId = await getOrgId()
  const raw = Object.fromEntries(formData)
  const parsed = tenantSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const tenant = await prisma.tenant.create({
    data: { organizationId: orgId, ...parsed.data, email: parsed.data.email || null },
  })
  revalidatePath("/inquilinos")
  return { redirectTo: `/inquilinos/${tenant.id}` }
}

export async function updateTenant(id: string, formData: FormData) {
  const orgId = await getOrgId()
  const raw = Object.fromEntries(formData)
  const parsed = tenantSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.tenant.updateMany({
    where: { id, organizationId: orgId },
    data: { ...parsed.data, email: parsed.data.email || null },
  })
  revalidatePath("/inquilinos")
  revalidatePath(`/inquilinos/${id}`)
  return { redirectTo: `/inquilinos/${id}` }
}

export async function deleteTenant(id: string) {
  const orgId = await getOrgId()
  await prisma.tenant.deleteMany({ where: { id, organizationId: orgId } })
  revalidatePath("/inquilinos")
  redirect("/inquilinos")
}
