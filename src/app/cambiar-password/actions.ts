"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { updateTag } from "next/cache"

export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "No autenticado" }
  const userId = session.user.id

  const current = formData.get("current") as string
  const newPass = formData.get("newPass") as string
  const confirm = formData.get("confirm") as string

  if (!current || !newPass || !confirm) return { error: "Todos los campos son requeridos" }
  if (newPass !== confirm) return { error: "Las contraseñas no coinciden" }
  if (newPass.length < 10) return { error: "La nueva contraseña debe tener al menos 10 caracteres" }
  if (newPass === current) return { error: "La nueva contraseña no puede ser igual a la actual" }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.passwordHash) return { error: "Usuario sin contraseña" }

  const valid = await bcrypt.compare(current, user.passwordHash)
  if (!valid) return { error: "Contraseña actual incorrecta" }

  const hash = await bcrypt.hash(newPass, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash, mustChangePassword: false },
  })
  updateTag("session-user")
  // El JWT callback en auth.ts re-chequea DB mientras token.mustChangePassword=true.
  // El próximo request del cliente (window.location.href = "/dashboard") va a leer
  // el flag actualizado y el proxy lo deja pasar al dashboard sin loop.
  return { ok: true }
}
