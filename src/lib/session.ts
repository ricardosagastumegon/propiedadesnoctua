// Helpers para acceder a la sesión de NextAuth desde server components y server actions.
// Una sola fuente de verdad para "obtener orgId / userId / role" — con types correctos.
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Session } from "next-auth"

/**
 * Obtiene la sesión actual. Si no hay sesión válida, redirige a /login.
 * Use desde server components — NextAuth ya throwea apropiadamente desde server actions.
 */
export async function getSessionOrRedirect(): Promise<Session> {
  const session = await auth()
  if (!session?.user?.organizationId) {
    redirect("/login")
  }
  return session
}

/**
 * Helper para server actions: obtiene la sesión completa o lanza error.
 * NO redirige (las server actions deben retornar errores estructurados).
 */
export async function getSessionOrThrow(): Promise<Session> {
  const session = await auth()
  if (!session?.user?.organizationId) {
    throw new Error("No autenticado")
  }
  return session
}

/**
 * Atajo más común: solo necesitás el orgId.
 * En server actions, lanza si no hay sesión.
 */
export async function getOrgIdFromSession(): Promise<string> {
  const session = await getSessionOrThrow()
  return session.user.organizationId
}

/**
 * Atajo: orgId + userId + name (campos típicos para logActivity y prisma writes).
 */
export async function getActorContext(): Promise<{
  orgId: string
  userId: string
  actorName: string
  role: string
  authorityPolicy: string
  canAcceptServices: boolean
}> {
  const session = await getSessionOrThrow()
  return {
    orgId: session.user.organizationId,
    userId: session.user.id,
    actorName: session.user.name ?? "Usuario",
    role: session.user.role,
    authorityPolicy: session.user.authorityPolicy,
    canAcceptServices: session.user.canAcceptServices,
  }
}

/**
 * Valida que el usuario actual tenga uno de los roles permitidos.
 * Lanza si no — usar en server actions sensibles.
 */
export async function requireRole(allowed: readonly string[]): Promise<{
  orgId: string
  userId: string
  role: string
}> {
  const session = await getSessionOrThrow()
  if (!allowed.includes(session.user.role)) {
    throw new Error(`Acción no permitida para el rol ${session.user.role}`)
  }
  return {
    orgId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role,
  }
}

/**
 * Para server components que necesitan el user completo.
 */
export async function getCurrentUser() {
  const session = await getSessionOrRedirect()
  return session.user
}
