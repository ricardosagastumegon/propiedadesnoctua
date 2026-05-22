// Helpers para crear y reparar tenants/organizaciones.
// Centraliza TODO lo que un tenant nuevo necesita para funcionar correctamente.
// NOTA: usa prisma — solo desde server components/actions o scripts CLI (NO desde "use client").
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const DEFAULT_PREPAYMENT_CAP = 80

// Tipos de registros de activo precargados — necesarios para que /activos/[id] funcione
// sin tener que crearlos manualmente cada vez.
const SYSTEM_ASSET_RECORD_TYPES = [
  { code: "INSURANCE", name: "Seguro" },
  { code: "REGISTRATION", name: "Matrícula / Registro" },
  { code: "LICENSE", name: "Licencia" },
  { code: "INSPECTION", name: "Inspección técnica" },
  { code: "WARRANTY", name: "Garantía" },
  { code: "PERMIT", name: "Permiso de operación" },
] as const

export interface CreateOrganizationInput {
  name: string
  slug: string
  type?: string
  taxId?: string | null
  currency?: string
  timezone?: string
  prepaymentCapPercentage?: number
  // Primer admin
  adminEmail: string
  adminName: string
  adminPassword: string
  adminPhone?: string | null
  /** Si true, el admin DEBE cambiar la contraseña en su primer login. */
  forcePasswordChange?: boolean
}

export interface CreateOrganizationResult {
  organizationId: string
  adminUserId: string
}

/**
 * Crea una organización NUEVA con todo lo que necesita para operar:
 *  - Organization
 *  - OrganizationSettings (cap de prepago)
 *  - Usuario OWNER con todos los permisos
 *  - 6 AssetRecordTypes del sistema
 *
 * Si la org/usuario ya existen, lanza error (no upsert — esto es para creación nueva).
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<CreateOrganizationResult> {
  // Validaciones
  if (!input.name?.trim()) throw new Error("Nombre de organización requerido")
  if (!input.slug?.trim()) throw new Error("Slug requerido")
  if (!input.adminEmail?.trim()) throw new Error("Email del admin requerido")
  if (!input.adminName?.trim()) throw new Error("Nombre del admin requerido")
  if (!input.adminPassword || input.adminPassword.length < 8) {
    throw new Error("Contraseña del admin debe tener al menos 8 caracteres")
  }
  const slugClean = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, "")
  if (!slugClean) throw new Error("Slug inválido")

  // Chequear que no exista
  const [existingOrg, existingUser] = await Promise.all([
    prisma.organization.findUnique({ where: { slug: slugClean } }),
    prisma.user.findUnique({ where: { email: input.adminEmail.toLowerCase() } }),
  ])
  if (existingOrg) throw new Error(`Ya existe una organización con slug "${slugClean}"`)
  if (existingUser) throw new Error(`Ya existe un usuario con email "${input.adminEmail}"`)

  const hash = await bcrypt.hash(input.adminPassword, 12)

  // Crear todo en transacción para garantizar consistencia
  return prisma.$transaction(async tx => {
    const org = await tx.organization.create({
      data: {
        name: input.name.trim(),
        slug: slugClean,
        type: input.type ?? "FAMILY",
        taxId: input.taxId ?? null,
        currency: input.currency ?? "GTQ",
        timezone: input.timezone ?? "America/Guatemala",
      },
    })

    await tx.organizationSettings.create({
      data: {
        organizationId: org.id,
        prepaymentCapPercentage: input.prepaymentCapPercentage ?? DEFAULT_PREPAYMENT_CAP,
      },
    })

    const adminUser = await tx.user.create({
      data: {
        organizationId: org.id,
        email: input.adminEmail.toLowerCase().trim(),
        name: input.adminName.trim(),
        phone: input.adminPhone?.trim() || null,
        passwordHash: hash,
        role: "OWNER",
        authorityPolicy: "ALONE",
        canAcceptServices: true,
        isActive: true,
        mustChangePassword: input.forcePasswordChange ?? false,
      },
    })

    // 6 tipos de registros del sistema (necesarios para /activos/[id])
    await tx.assetRecordType.createMany({
      data: SYSTEM_ASSET_RECORD_TYPES.map(t => ({
        organizationId: org.id,
        code: t.code,
        name: t.name,
        isSystem: true,
        isActive: true,
      })),
    })

    return { organizationId: org.id, adminUserId: adminUser.id }
  })
}

export interface RepairTenantResult {
  organizationId: string
  organizationName: string
  fixed: {
    organizationSettings: boolean
    assetRecordTypes: number  // cuántos se crearon
  }
}

/**
 * Repara un tenant existente que pueda estar incompleto (ej: creado antes de tener
 * createOrganization, o con un script viejo). Idempotente: si todo está bien, no hace nada.
 *
 * Garantiza:
 *  - OrganizationSettings existe
 *  - Los 6 AssetRecordTypes del sistema existen (crea los que faltan)
 */
export async function repairTenant(organizationId: string): Promise<RepairTenantResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  })
  if (!org) throw new Error(`Organización ${organizationId} no existe`)

  const result: RepairTenantResult = {
    organizationId: org.id,
    organizationName: org.name,
    fixed: { organizationSettings: false, assetRecordTypes: 0 },
  }

  // 1. OrganizationSettings
  const existingSettings = await prisma.organizationSettings.findUnique({
    where: { organizationId: org.id },
  })
  if (!existingSettings) {
    await prisma.organizationSettings.create({
      data: { organizationId: org.id, prepaymentCapPercentage: DEFAULT_PREPAYMENT_CAP },
    })
    result.fixed.organizationSettings = true
  }

  // 2. AssetRecordTypes — crear los que falten (sin tocar los existentes)
  const existingTypes = await prisma.assetRecordType.findMany({
    where: { organizationId: org.id },
    select: { code: true },
  })
  const existingCodes = new Set(existingTypes.map(t => t.code))
  const missing = SYSTEM_ASSET_RECORD_TYPES.filter(t => !existingCodes.has(t.code))
  if (missing.length > 0) {
    await prisma.assetRecordType.createMany({
      data: missing.map(t => ({
        organizationId: org.id,
        code: t.code,
        name: t.name,
        isSystem: true,
        isActive: true,
      })),
    })
    result.fixed.assetRecordTypes = missing.length
  }

  return result
}

/**
 * Repara todos los tenants de la DB. Útil después de cambios de schema/seed.
 */
export async function repairAllTenants(): Promise<RepairTenantResult[]> {
  const orgs = await prisma.organization.findMany({ select: { id: true } })
  const results: RepairTenantResult[] = []
  for (const org of orgs) {
    results.push(await repairTenant(org.id))
  }
  return results
}
