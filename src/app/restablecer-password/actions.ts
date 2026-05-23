"use server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

interface ResetInput {
  token: string
  newPassword: string
  confirm: string
}

/**
 * Aplica el cambio de contraseña usando un token válido.
 * Invalida el token y cualquier otro pendiente del mismo usuario.
 */
export async function applyPasswordReset(input: ResetInput) {
  if (!input.token) return { error: "Token requerido" }
  if (!input.newPassword || input.newPassword.length < 10) {
    return { error: "La contraseña debe tener al menos 10 caracteres" }
  }
  if (input.newPassword !== input.confirm) {
    return { error: "Las contraseñas no coinciden" }
  }

  const tokenRow = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
    include: { user: { select: { id: true, isActive: true } } },
  })
  if (!tokenRow) return { error: "Enlace inválido" }
  if (tokenRow.usedAt) return { error: "Este enlace ya fue usado" }
  if (tokenRow.expiresAt < new Date()) return { error: "El enlace expiró. Pedí uno nuevo." }
  if (!tokenRow.user.isActive) return { error: "Usuario inactivo" }

  const hash = await bcrypt.hash(input.newPassword, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRow.userId },
      data: { passwordHash: hash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    }),
    // Invalidar otros tokens pendientes del mismo usuario
    prisma.passwordResetToken.updateMany({
      where: { userId: tokenRow.userId, usedAt: null, id: { not: tokenRow.id } },
      data: { usedAt: new Date() },
    }),
  ])

  return { ok: true }
}
