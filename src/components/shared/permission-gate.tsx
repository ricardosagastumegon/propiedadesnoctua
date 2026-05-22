"use client"
import { useSession } from "next-auth/react"
import { can, type Action, type Module, type UserForPermissions } from "@/lib/permissions"

interface Props {
  module: Module
  action: Action
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Wrapper que renderiza children solo si el user actual puede.
 * Lee de la sesión client-side. Para server components, usar `can(user, ...)` directamente.
 *
 * IMPORTANTE: Esto es UX (ocultar botones). La seguridad real está en las server actions.
 */
export function PermissionGate({ module, action, children, fallback = null }: Props) {
  const { data: session } = useSession()
  const user = session?.user as UserForPermissions | undefined
  if (!can(user, module, action)) return <>{fallback}</>
  return <>{children}</>
}
