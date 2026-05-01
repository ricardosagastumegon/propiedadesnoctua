"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"

async function getOrgId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return (session.user as any).organizationId as string
}

async function getUserId() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return session.user!.id!
}

export async function updateOrganization(formData: FormData) {
  const orgId = await getOrgId()
  const name = formData.get("name") as string
  const taxId = formData.get("taxId") as string || null

  if (!name?.trim()) return { error: { name: ["Nombre requerido"] } }

  await prisma.organization.update({
    where: { id: orgId },
    data: { name, taxId },
  })
  revalidatePath("/configuracion")
}

export async function updateMyAccount(formData: FormData) {
  const userId = await getUserId()
  const name = formData.get("name") as string
  const email = formData.get("email") as string

  if (!name?.trim()) return { error: { name: ["Nombre requerido"] } }
  if (!email?.trim()) return { error: { email: ["Correo requerido"] } }

  await prisma.user.update({
    where: { id: userId },
    data: { name, email },
  })
  revalidatePath("/configuracion")
}

export async function changePassword(formData: FormData) {
  const userId = await getUserId()
  const current = formData.get("current") as string
  const newPass = formData.get("newPass") as string
  const confirm = formData.get("confirm") as string

  if (!current || !newPass || !confirm) return { error: "Todos los campos son requeridos" }
  if (newPass !== confirm) return { error: "Las contraseñas no coinciden" }
  if (newPass.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.passwordHash) return { error: "Usuario sin contraseña" }

  const valid = await bcrypt.compare(current, user.passwordHash)
  if (!valid) return { error: "Contraseña actual incorrecta" }

  const hash = await bcrypt.hash(newPass, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
}

export async function createUser(formData: FormData) {
  const orgId = await getOrgId()
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as string || "VIEWER"
  const password = formData.get("password") as string

  if (!name || !email || !password) return { error: "Todos los campos son requeridos" }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "El correo ya esta registrado" }

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { name, email, passwordHash: hash, role, organizationId: orgId },
  })
  revalidatePath("/configuracion")
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const orgId = await getOrgId()
  const me = await getUserId()
  if (userId === me) return { error: "No puedes desactivar tu propia cuenta" }
  await prisma.user.updateMany({ where: { id: userId, organizationId: orgId }, data: { isActive } })
  revalidatePath("/configuracion")
}

export async function updateUserRole(userId: string, role: string) {
  const orgId = await getOrgId()
  await prisma.user.updateMany({ where: { id: userId, organizationId: orgId }, data: { role } })
  revalidatePath("/configuracion")
}

export async function updateUserAuthorityPolicy(userId: string, authorityPolicy: string) {
  const orgId = await getOrgId()
  await prisma.user.updateMany({ where: { id: userId, organizationId: orgId }, data: { authorityPolicy } })
  revalidatePath("/configuracion")
}

export async function setCosignPolicy(userId: string, cosignerIds: string[]) {
  const orgId = await getOrgId()
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } })
  if (!user) return { error: "Usuario no encontrado" }

  const existing = await prisma.cosignPolicy.findUnique({ where: { userId } })
  if (existing) {
    await prisma.cosignPolicy.update({
      where: { userId },
      data: { allowedCosigners: { set: cosignerIds.map(id => ({ id })) } },
    })
  } else {
    await prisma.cosignPolicy.create({
      data: { userId, allowedCosigners: { connect: cosignerIds.map(id => ({ id })) } },
    })
  }
  revalidatePath("/configuracion")
}
