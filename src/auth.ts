import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

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
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string
        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
          include: { organization: true },
        })
        if (!user?.passwordHash) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        // Fallback: derive authority from role when not explicitly set
        const effectivePolicy = user.authorityPolicy
          ?? (user.role === "ADMIN" ? "ALONE"
            : user.role === "MANAGER" || user.role === "SUPERVISOR" ? "COSIGN_REQUIRED"
            : "NONE")

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          authorityPolicy: effectivePolicy,
          canAcceptServices: user.canAcceptServices,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.authorityPolicy = user.authorityPolicy
        token.canAcceptServices = user.canAcceptServices
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
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
      }
      return session
    },
  },
})