"use server"
import { prisma } from "@/lib/prisma"
import { tenantSchema } from "@/lib/schemas/tenant"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { tryGuard, guardAction } from "@/lib/action-guard"

export async function createTenant(formData: FormData) {
  const g = await tryGuard({ module: "inquilinos", action: "create" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

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
  const g = await tryGuard({ module: "inquilinos", action: "edit" })
  if ("error" in g) return { error: g.error }
  const orgId = g.user.organizationId

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
  const user = await guardAction({ module: "inquilinos", action: "delete" })
  await prisma.tenant.deleteMany({ where: { id, organizationId: user.organizationId } })
  revalidatePath("/inquilinos")
  redirect("/inquilinos")
}
