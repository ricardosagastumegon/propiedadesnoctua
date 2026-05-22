"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { propertySchema } from "@/lib/schemas/property"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { logError } from "@/lib/observability"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return session.user.organizationId
}

export async function createProperty(formData: FormData) {
  let orgId: string
  try {
    orgId = await getOrgId()
  } catch (e) {
    return { error: "Sesión inválida. Volvé a iniciar sesión." }
  }

  const raw = Object.fromEntries(formData)
  const parsed = propertySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Validar que la organización existe (defense contra JWT stale tras migrate reset)
  const orgExists = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
  if (!orgExists) {
    return { error: `Tu sesión apunta a una organización que ya no existe (id ${orgId.slice(0, 8)}…). Cerrá sesión y volvé a entrar.` }
  }

  const d = parsed.data
  try {
    const property = await prisma.property.create({
      data: {
        organizationId: orgId,
        ...d,
        acquisitionDate: d.acquisitionDate ? new Date(d.acquisitionDate) : null,
      },
    })
    revalidatePath("/propiedades")
    return { redirectTo: `/propiedades/${property.id}` }
  } catch (e) {
    logError(e, { area: "property", orgId, extra: { action: "create", name: d.name } })
    const msg = (e as Error).message
    // Prisma errors: foreign key, unique constraint, etc.
    if (msg.includes("Foreign key constraint")) {
      return { error: "Tu sesión apunta a datos que no existen en la DB. Cerrá sesión y volvé a entrar." }
    }
    if (msg.includes("Unique constraint")) {
      return { error: "Ya existe una propiedad con esos datos clave." }
    }
    return { error: `Error al crear propiedad: ${msg}` }
  }
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
