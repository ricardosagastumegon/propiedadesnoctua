import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string
        const password = credentials?.password as string
        if (!email || !password) return null

        const ip = (request?.headers.get("x-forwarded-for")?.split(",")[0].trim()
          ?? request?.headers.get("x-real-ip")
          ?? "anonymous")
        const rlKey = `${ip}:${email.toLowerCase()}`

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { organization: true },
        })
        // Si el email no existe → null sin contar contra rate limit.
        // (evita que un atacante bloquee cualquier cuenta inundando con un email
        // que no existe; y permite al admin probar combinaciones sin penalizar.)
        if (!user?.passwordHash) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) {
          // Solo intentos FALLIDOS con email válido cuentan contra rate limit
          const r = await checkRateLimit("login", rlKey)
          if (!r.success) {
            console.warn(`[auth] rate limit hit for ${ip}/${email}`)
          }
          return null
        }

        if (!user.isActive) {
          console.warn(`[auth] login attempt on inactive user: ${email}`)
          return null
        }

        // Fallback: derive authority from role when not explicitly set
        const effectivePolicy = user.authorityPolicy
          ?? (user.role === "ADMIN" ? "ALONE"
            : user.role === "MANAGER" || user.role === "SUPERVISOR" ? "COSIGN_REQUIRED"
            : "NONE")

        // Update lastLoginAt (fire-and-forget, no esperar)
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {})

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          authorityPolicy: effectivePolicy,
          canAcceptServices: user.canAcceptServices,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.authorityPolicy = user.authorityPolicy
        token.canAcceptServices = user.canAcceptServices
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
      }
      // En cada update (client-side useSession().update()) re-lee TODO desde DB.
      if (trigger === "update" && token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            mustChangePassword: true,
            role: true,
            authorityPolicy: true,
            canAcceptServices: true,
            organizationId: true,
            name: true,
            isActive: true,
          },
        })
        if (u) {
          token.mustChangePassword = u.mustChangePassword
          token.role = u.role
          token.authorityPolicy = u.authorityPolicy
          token.canAcceptServices = u.canAcceptServices
          token.organizationId = u.organizationId
        }
      }
      // BULLETPROOF: mientras el usuario tenga mustChangePassword=true en el JWT,
      // re-chequear DB en cada request. Apenas cambien la password en DB, este
      // callback lo detecta sin depender de update() ni de signIn server-side.
      // Cuesta 1 query extra solo durante la ventana de "debe cambiar password"
      // (típicamente segundos). Una vez false, no se ejecuta más.
      else if (token.mustChangePassword === true && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { mustChangePassword: true },
        })
        if (fresh && !fresh.mustChangePassword) {
          token.mustChangePassword = false
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.authorityPolicy = token.authorityPolicy
        session.user.canAcceptServices = token.canAcceptServices
        session.user.organizationId = token.organizationId
        session.user.organizationName = token.organizationName
        ;(session.user as unknown as { mustChangePassword: boolean }).mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    },
  },
})