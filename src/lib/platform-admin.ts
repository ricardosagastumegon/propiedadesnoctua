// Super-admin de la plataforma (dueño de Noctua), distinto del admin de cada
// organización. Se controla por env var PLATFORM_ADMIN_EMAILS (lista separada
// por comas) — seguro porque no se puede escalar desde la app, solo desde el deploy.
import { auth } from "@/auth"

function allowedEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return allowedEmails().includes(email.toLowerCase())
}

/** True si el usuario logueado es super-admin de la plataforma. */
export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const session = await auth()
  return isPlatformAdminEmail(session?.user?.email)
}
