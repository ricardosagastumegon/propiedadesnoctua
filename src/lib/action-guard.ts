// Defense-in-depth para server actions de mutación.
// - Valida que el rol del usuario pueda realizar la acción sobre el módulo.
// - Si la acción es sobre una propiedad específica, valida que el usuario tenga
//   acceso a ella (UserPropertyAccess).
//
// Uso típico:
//   const user = await guardAction({ module: "propiedades", action: "create" })
//   const user = await guardAction({ module: "mantenimiento", action: "edit", propertyId: ticket.propertyId })
//
// Errores: lanza con mensaje claro. El caller debe envolverlo en try/catch y
// devolver { error } estructurado al cliente.
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { can, type Module, type Action } from "@/lib/permissions"

export class ActionForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionForbiddenError"
  }
}

interface GuardOptions {
  module: Module
  action: Action
  /** Si se pasa, valida acceso a esa propiedad (UserPropertyAccess). */
  propertyId?: string | null
}

interface GuardedUser {
  id: string
  role: string
  organizationId: string
  name: string
}

/**
 * Valida rol + acceso a propiedad. Lanza ActionForbiddenError si falla.
 * Devuelve el user (id, role, orgId, name) listo para usar en la action.
 *
 * NOTA: Esto es defense-in-depth — NO sustituye validaciones de negocio
 * (cap 80%, anti-cosignatura, etc.). Se aplica ANTES.
 */
export async function guardAction(opts: GuardOptions): Promise<GuardedUser> {
  const session = await auth()
  if (!session?.user?.id || !session.user.organizationId) {
    throw new ActionForbiddenError("No autenticado")
  }

  const user: GuardedUser = {
    id: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId,
    name: session.user.name ?? "Usuario",
  }

  // Bloqueo por-usuario (deniedModules): se lee fresco de la DB para que aplique
  // de inmediato, sin depender de re-login (el JWT no lo re-lee por request).
  const denyRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { deniedModules: true },
  })
  const deniedModules = denyRow?.deniedModules ?? []

  // 1. Permiso de rol (+ bloqueo por-usuario)
  if (!can({ ...user, deniedModules }, opts.module, opts.action)) {
    throw new ActionForbiddenError(
      `No tenés permiso para ${opts.action} en ${opts.module}`,
    )
  }

  // 2. Acceso a la propiedad (si aplica)
  if (opts.propertyId) {
    const ownAccess = await prisma.userPropertyAccess.findMany({
      where: { userId: user.id },
      select: { propertyId: true },
    })
    // Convención: sin filas → acceso total. Con filas → solo esas.
    if (ownAccess.length > 0) {
      const allowed = new Set(ownAccess.map(a => a.propertyId))
      if (!allowed.has(opts.propertyId)) {
        throw new ActionForbiddenError("No tenés acceso a esa propiedad")
      }
    }
  }

  return user
}

/**
 * Helper para envolver una server action con guard + manejo de error
 * estandarizado. Si guardAction lanza, devuelve { error: mensaje }.
 *
 * Uso:
 *   const guardResult = await tryGuard({ module: "propiedades", action: "create" })
 *   if ("error" in guardResult) return guardResult
 *   const user = guardResult.user
 *   ...resto de la action...
 */
export async function tryGuard(
  opts: GuardOptions,
): Promise<{ user: GuardedUser } | { error: string }> {
  try {
    const user = await guardAction(opts)
    return { user }
  } catch (e) {
    if (e instanceof ActionForbiddenError) return { error: e.message }
    return { error: (e as Error).message || "Acción no permitida" }
  }
}
