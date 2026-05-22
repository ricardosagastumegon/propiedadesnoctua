// Helpers para acceder a la sesión de NextAuth desde server components y server actions.
// Una sola fuente de verdad para "obtener orgId / userId / role" — con types correctos.
// Re-lee role/isActive/policies/canAcceptServices desde DB para invalidar JWT viejos
// cuando un admin cambia los permisos de un usuario.
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { unstable_cache } from "next/cache"
import type { Session } from "next-auth"

// Cache 30s para no pegarle a DB en cada request. Si admin cambia rol, surte
// efecto en máximo 30s o forzando logout.
const getFreshUserCached = unstable_cache(
  async (userId: string) => {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        authorityPolicy: true,
        canAcceptServices: true,
        organizationId: true,
        isActive: true,
        mustChangePassword: true,
      },
    })
  },
  ["session-user-refresh"],
  { revalidate: 30, tags: ["session-user"] },
)

/**
 * Refresca los campos críticos del session.user con los valores actuales de DB.
 * Si el user fue desactivado, lanza para forzar logout.
 */
async function refreshSessionUser(session: Session): Promise<Session> {
  const fresh = await getFreshUserCached(session.user.id)
  if (!fresh) {
    throw new Error("USER_NOT_FOUND")
  }
  if (!fresh.isActive) {
    throw new Error("USER_INACTIVE")
  }
  // Mutate session in-place with fresh values
  session.user.role = fresh.role
  session.user.authorityPolicy = fresh.authorityPolicy
  session.user.canAcceptServices = fresh.canAcceptServices
  session.user.organizationId = fresh.organizationId
  session.user.email = fresh.email
  session.user.name = fresh.name
  return session
}

/**
 * Obtiene la sesión actual. Si no hay sesión válida, redirige a /login.
 * Use desde server components — NextAuth ya throwea apropiadamente desde server actions.
 */
export async function getSessionOrRedirect(): Promise<Session> {
  const session = await auth()
  if (!session?.user?.organizationId) {
    redirect("/login")
  }
  try {
    return await refreshSessionUser(session)
  } catch (e) {
    if ((e as Error).message === "USER_INACTIVE" || (e as Error).message === "USER_NOT_FOUND") {
      redirect("/login")
    }
    throw e
  }
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
