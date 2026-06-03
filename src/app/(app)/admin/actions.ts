"use server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { isCurrentUserPlatformAdmin } from "@/lib/platform-admin"
import { createOrganization } from "@/lib/tenant"
import { parseEnabledModules, TOGGLEABLE_MODULES } from "@/lib/permissions"

async function requirePlatformAdmin() {
  if (!(await isCurrentUserPlatformAdmin())) {
    throw new Error("No autorizado")
  }
}

/** Crea una organización nueva (tenant) con su admin. Solo platform admin. */
export async function adminCreateTenant(formData: FormData) {
  await requirePlatformAdmin()

  const name = (formData.get("name") as string)?.trim()
  const adminName = (formData.get("adminName") as string)?.trim()
  const adminEmail = (formData.get("adminEmail") as string)?.trim().toLowerCase()
  const adminPassword = formData.get("adminPassword") as string
  const realEstateMode = formData.get("realEstateMode") === "on"

  if (!name || !adminName || !adminEmail || !adminPassword) {
    return { error: "Todos los campos son requeridos" }
  }
  if (adminPassword.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }

  const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "org"

  let result
  try {
    result = await createOrganization({
      name, slug, adminName, adminEmail, adminPassword, forcePasswordChange: false,
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Modo inmobiliario: solo dashboard, propiedades, inquilinos, contratos, reportes
  if (realEstateMode) {
    await prisma.organizationSettings.update({
      where: { organizationId: result.organizationId },
      data: { enabledModules: ["propiedades", "inquilinos", "contratos", "pagos", "reportes"] },
    })
  }

  revalidatePath("/admin")
  return { ok: true, organizationId: result.organizationId }
}

/** Actualiza los módulos habilitados de una organización. Solo platform admin. */
export async function adminSetModules(organizationId: string, modules: string[]): Promise<{ ok: true } | { error: string }> {
  try {
    await requirePlatformAdmin()
  } catch {
    return { error: "No autorizado" }
  }
  const valid = parseEnabledModules(modules) ?? []
  // null = todos. Si selecciona todos los toggleables, guardamos null (= todos).
  const allToggleable = TOGGLEABLE_MODULES.every(m => valid.includes(m))
  await prisma.organizationSettings.upsert({
    where: { organizationId },
    update: { enabledModules: allToggleable ? Prisma.JsonNull : valid },
    create: { organizationId, enabledModules: allToggleable ? Prisma.JsonNull : valid },
  })
  revalidatePath("/admin")
  revalidatePath("/configuracion")
  return { ok: true }
}
