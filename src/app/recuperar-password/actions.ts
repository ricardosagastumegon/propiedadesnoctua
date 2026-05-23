"use server"
import crypto from "crypto"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"

const TOKEN_TTL_MS = 60 * 60 * 1000  // 1 hora

function newToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Solicita el envío de un email con link de reset.
 * SEGURIDAD: siempre devuelve el mismo mensaje, exista o no el email,
 * para no filtrar qué cuentas están registradas (user enumeration).
 */
export async function requestPasswordReset(formData: FormData) {
  // Rate limit por IP
  const h = await headers()
  const ip = (h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "anonymous")
  const r = await checkRateLimit("reset", ip)
  if (!r.success) {
    return { error: "Demasiados intentos. Esperá unos minutos." }
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase()
  if (!email) return { error: "Email requerido" }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, isActive: true },
  })

  // Si el usuario existe y está activo, crear token y enviar email.
  // Si no existe, fingir éxito.
  if (user && user.isActive) {
    const token = newToken()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.noctuapo.com"
    const resetLink = `${appUrl}/restablecer-password?token=${token}`
    await sendPasswordResetEmail(email, resetLink)
  }

  return { ok: true }
}
