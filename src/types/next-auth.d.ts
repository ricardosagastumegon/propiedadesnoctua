// NextAuth v5 module augmentation.
// Hace que session.user.organizationId sea tipo-chequeado sin "as any".
// Los campos siguen exactamente lo que devuelve `authorize()` en src/auth.ts.

import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      role: string
      authorityPolicy: string
      canAcceptServices: boolean
      organizationId: string
      organizationName: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    authorityPolicy: string
    canAcceptServices: boolean
    organizationId: string
    organizationName: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    authorityPolicy: string
    canAcceptServices: boolean
    organizationId: string
    organizationName: string
  }
}
