"use server"
import bcrypt from "bcryptjs"
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

function genPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ", lower = "abcdefghijkmnopqrstuvwxyz", digits = "23456789", sym = "!@#$%&*"
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
  const pool = [pick(upper), pick(upper), pick(lower), pick(lower), pick(lower), pick(digits), pick(digits), pick(sym)]
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return pool.join("")
}

/**
 * Resetea la contraseña de cualquier usuario (de cualquier tenant).
 * Genera una temporal, NO fuerza cambio (entra directo). Solo platform admin.
 */
export async function adminResetUserPassword(userId: string): Promise<{ ok: true; email: string; name: string; password: string } | { error: string }> {
  try { await requirePlatformAdmin() } catch { return { error: "No autorizado" } }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (!user) return { error: "Usuario no encontrado" }
  const password = genPassword()
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false, isActive: true },
  })
  revalidatePath("/admin")
  return { ok: true, email: user.email, name: user.name, password }
}

/**
 * Define una contraseña ESPECÍFICA (elegida por el admin) para un usuario.
 * El admin la conoce porque la escribe. No fuerza cambio. Solo platform admin.
 */
export async function adminSetUserPassword(userId: string, password: string): Promise<{ ok: true; email: string; name: string } | { error: string }> {
  try { await requirePlatformAdmin() } catch { return { error: "No autorizado" } }
  if (!password || password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (!user) return { error: "Usuario no encontrado" }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false, isActive: true },
  })
  revalidatePath("/admin")
  return { ok: true, email: user.email, name: user.name }
}

/** Activa/desactiva un usuario de cualquier tenant. Solo platform admin. */
export async function adminToggleUserActive(userId: string, isActive: boolean): Promise<{ ok: true } | { error: string }> {
  try { await requirePlatformAdmin() } catch { return { error: "No autorizado" } }
  await prisma.user.update({ where: { id: userId }, data: { isActive } })
  revalidatePath("/admin")
  return { ok: true }
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
