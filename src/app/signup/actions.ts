"use server"
import { z } from "zod"
import { headers } from "next/headers"
import { signIn } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createOrganization } from "@/lib/tenant"
import { sendWelcomeEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"

const signupSchema = z.object({
  orgName: z.string().trim().min(2, "Nombre de la organización requerido"),
  orgType: z.enum(["FAMILY", "COMPANY"]).default("FAMILY"),
  taxId: z.string().trim().optional(),
  adminName: z.string().trim().min(2, "Nombre del administrador requerido"),
  adminEmail: z.string().trim().toLowerCase().email("Email inválido"),
  adminPhone: z.string().trim().optional(),
  adminPassword: z.string().min(10, "La contraseña debe tener al menos 10 caracteres"),
  adminPasswordConfirm: z.string().min(10),
  acceptTerms: z.literal("on", { message: "Debés aceptar los términos" }),
}).refine(d => d.adminPassword === d.adminPasswordConfirm, {
  message: "Las contraseñas no coinciden",
  path: ["adminPasswordConfirm"],
})

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org"
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let n = 1
  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    n++
    slug = `${base}-${n}`
    if (n > 100) throw new Error("No se pudo generar slug único")
  }
  return slug
}

export async function createOrganizationWithOwner(formData: FormData) {
  // Rate limit por IP — anti abuso de signup
  const h = await headers()
  const ip = (h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "anonymous")
  const r = await checkRateLimit("signup", ip)
  if (!r.success) {
    return { error: "Demasiados intentos. Esperá unos minutos antes de volver a intentar." }
  }

  const raw = Object.fromEntries(formData)
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  const d = parsed.data

  // Email único global — no permitir si ya existe en CUALQUIER organización
  const existingUser = await prisma.user.findUnique({ where: { email: d.adminEmail }, select: { id: true } })
  if (existingUser) {
    return { error: { adminEmail: ["Ya existe una cuenta con ese email"] } }
  }

  const baseSlug = slugify(d.orgName)
  const slug = await uniqueSlug(baseSlug)

  // Reutiliza la misma lógica que el script create-tenant: Org + Settings + Owner + 6 AssetRecordTypes
  let result
  try {
    result = await createOrganization({
      name: d.orgName,
      slug,
      type: d.orgType,
      taxId: d.taxId || null,
      adminName: d.adminName,
      adminEmail: d.adminEmail,
      adminPassword: d.adminPassword,
      adminPhone: d.adminPhone || null,
      forcePasswordChange: false,
    })
  } catch (e) {
    return { error: (e as Error).message || "Error al crear la organización" }
  }

  // Welcome email (no bloquear si falla — el signup ya fue exitoso)
  sendWelcomeEmail(d.adminEmail, d.adminName, d.orgName).catch(() => {})

  // Iniciar sesión automáticamente
  try {
    await signIn("credentials", {
      email: d.adminEmail,
      password: d.adminPassword,
      redirect: false,
    })
  } catch {
    // Si el auto-login falla, el usuario puede entrar manualmente. No es fatal.
  }

  return {
    ok: true,
    organizationId: result.organizationId,
    redirectTo: "/dashboard",
  }
}
