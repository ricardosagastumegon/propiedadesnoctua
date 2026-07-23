"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath, updateTag } from "next/cache"
import bcrypt from "bcryptjs"
import { logActivity } from "@/lib/activity-log"

async function requireAdminSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado")
  const role = session.user.role
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Solo administradores pueden gestionar usuarios")
  }
  // Bloqueo por-usuario: un admin con "configuracion" en deniedModules no gestiona usuarios.
  const deny = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deniedModules: true },
  })
  if (deny?.deniedModules?.includes("configuracion")) {
    throw new Error("No tenés acceso a Configuración")
  }
  return {
    orgId: session.user.organizationId,
    userId: session.user.id,
    actorName: session.user.name,
  }
}

function generateTempPassword(): string {
  // 12 chars: 3 mayúsculas, 3 minúsculas, 3 números, 3 símbolos
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnopqrstuvwxyz"
  const digits = "23456789"
  const symbols = "!@#$%&*"
  const pool = [
    pick(upper), pick(upper), pick(upper),
    pick(lower), pick(lower), pick(lower),
    pick(digits), pick(digits), pick(digits),
    pick(symbols), pick(symbols), pick(symbols),
  ]
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.join("")
}
function pick(s: string): string { return s[Math.floor(Math.random() * s.length)] }

interface InviteInput {
  name: string
  email: string
  phone?: string | null
  role: string
  authorityPolicy: string
  canAcceptServices: boolean
  cosignerIds?: string[]
  propertyIds?: string[]  // vacío = todas
}

export async function inviteUser(input: InviteInput) {
  const { orgId, userId, actorName } = await requireAdminSession()

  if (!input.name?.trim() || !input.email?.trim() || !input.role) {
    return { error: "Nombre, email y rol son requeridos" }
  }
  const email = input.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "El correo ya está registrado" }

  const tempPassword = generateTempPassword()
  const hash = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.create({
    data: {
      organizationId: orgId,
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      role: input.role,
      authorityPolicy: input.authorityPolicy,
      canAcceptServices: input.canAcceptServices,
      passwordHash: hash,
      mustChangePassword: true,
      invitedById: userId,
      invitedAt: new Date(),
      isActive: true,
    },
  })

  // CosignPolicy si aplica
  if (input.authorityPolicy === "COSIGN_REQUIRED" && input.cosignerIds && input.cosignerIds.length > 0) {
    await prisma.cosignPolicy.create({
      data: {
        userId: user.id,
        allowedCosigners: { connect: input.cosignerIds.map(id => ({ id })) },
      },
    })
  }

  // Acceso a propiedades específicas (vacío = acceso total)
  if (input.propertyIds && input.propertyIds.length > 0) {
    await prisma.userPropertyAccess.createMany({
      data: input.propertyIds.map(propertyId => ({ userId: user.id, propertyId })),
    })
  }

  await logActivity({
    orgId, entityType: "USER", entityId: user.id, action: "CREATED",
    actorId: userId, actorName, metadata: { name: user.name, role: user.role },
  })
  revalidatePath("/configuracion")
  updateTag("session-user")

  return { ok: true, tempPassword, userEmail: email, userName: user.name }
}

interface UpdateUserInput {
  userId: string
  name?: string
  phone?: string | null
  role?: string
  authorityPolicy?: string
  canAcceptServices?: boolean
  cosignerIds?: string[]
  propertyIds?: string[]  // null/undefined = no cambiar, [] = acceso total
}

export async function updateUserAdmin(input: UpdateUserInput) {
  const { orgId, userId: meId, actorName } = await requireAdminSession()

  const target = await prisma.user.findFirst({ where: { id: input.userId, organizationId: orgId } })
  if (!target) return { error: "Usuario no encontrado" }

  // No permitir cambiar a sí mismo a un rol no-admin (lockout protection)
  if (target.id === meId && input.role && input.role !== "OWNER" && input.role !== "ADMIN") {
    return { error: "No puedes quitarte tus propios privilegios de administrador" }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.authorityPolicy !== undefined ? { authorityPolicy: input.authorityPolicy } : {}),
      ...(input.canAcceptServices !== undefined ? { canAcceptServices: input.canAcceptServices } : {}),
    },
  })

  // Cosign policy
  if (input.cosignerIds !== undefined) {
    if (input.cosignerIds.length === 0) {
      await prisma.cosignPolicy.deleteMany({ where: { userId: target.id } })
    } else {
      await prisma.cosignPolicy.upsert({
        where: { userId: target.id },
        update: { allowedCosigners: { set: input.cosignerIds.map(id => ({ id })) } },
        create: {
          userId: target.id,
          allowedCosigners: { connect: input.cosignerIds.map(id => ({ id })) },
        },
      })
    }
  }

  // Property access (reemplazar set completo)
  if (input.propertyIds !== undefined) {
    await prisma.userPropertyAccess.deleteMany({ where: { userId: target.id } })
    if (input.propertyIds.length > 0) {
      await prisma.userPropertyAccess.createMany({
        data: input.propertyIds.map(propertyId => ({ userId: target.id, propertyId })),
      })
    }
  }

  await logActivity({
    orgId, entityType: "USER", entityId: target.id, action: "UPDATED",
    actorId: meId, actorName,
  })
  revalidatePath("/configuracion")
  updateTag("session-user")

  return { ok: true }
}

export async function deactivateUser(targetId: string) {
  const { orgId, userId: meId, actorName } = await requireAdminSession()
  if (targetId === meId) return { error: "No puedes desactivar tu propia cuenta" }

  const target = await prisma.user.findFirst({ where: { id: targetId, organizationId: orgId } })
  if (!target) return { error: "Usuario no encontrado" }

  // No desactivar último OWNER
  if (target.role === "OWNER") {
    const activeOwners = await prisma.user.count({
      where: { organizationId: orgId, role: "OWNER", isActive: true },
    })
    if (activeOwners <= 1) return { error: "No se puede desactivar al último propietario de la organización" }
  }

  await prisma.user.update({ where: { id: targetId }, data: { isActive: false } })
  await logActivity({
    orgId, entityType: "USER", entityId: targetId, action: "DEACTIVATED",
    actorId: meId, actorName, metadata: { name: target.name },
  })
  revalidatePath("/configuracion")
  updateTag("session-user")
  return { ok: true }
}

export async function reactivateUser(targetId: string) {
  const { orgId, userId: meId, actorName } = await requireAdminSession()
  const target = await prisma.user.findFirst({ where: { id: targetId, organizationId: orgId } })
  if (!target) return { error: "Usuario no encontrado" }

  await prisma.user.update({ where: { id: targetId }, data: { isActive: true } })
  await logActivity({
    orgId, entityType: "USER", entityId: targetId, action: "REACTIVATED",
    actorId: meId, actorName, metadata: { name: target.name },
  })
  revalidatePath("/configuracion")
  updateTag("session-user")
  return { ok: true }
}

export async function resetUserPassword(targetId: string) {
  const { orgId, userId: meId, actorName } = await requireAdminSession()
  const target = await prisma.user.findFirst({ where: { id: targetId, organizationId: orgId } })
  if (!target) return { error: "Usuario no encontrado" }

  const tempPassword = generateTempPassword()
  const hash = await bcrypt.hash(tempPassword, 12)
  await prisma.user.update({
    where: { id: targetId },
    data: { passwordHash: hash, mustChangePassword: true },
  })
  await logActivity({
    orgId, entityType: "USER", entityId: targetId, action: "PASSWORD_RESET",
    actorId: meId, actorName, metadata: { name: target.name },
  })
  revalidatePath("/configuracion")
  return { ok: true, tempPassword, userEmail: target.email, userName: target.name }
}

/**
 * Admin establece una contraseña ESPECÍFICA para un usuario, sin forzarlo a
 * cambiarla en el próximo login. Útil cuando el admin quiere darle al usuario
 * una contraseña ya definida y que entre directo al dashboard.
 */
export async function setUserPasswordManual(targetId: string, password: string, forceChange: boolean) {
  const { orgId, userId: meId, actorName } = await requireAdminSession()
  if (!password || password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" }
  }
  const target = await prisma.user.findFirst({ where: { id: targetId, organizationId: orgId } })
  if (!target) return { error: "Usuario no encontrado" }

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: targetId },
    data: { passwordHash: hash, mustChangePassword: forceChange },
  })
  await logActivity({
    orgId, entityType: "USER", entityId: targetId, action: "PASSWORD_SET_MANUAL",
    actorId: meId, actorName, metadata: { name: target.name, forceChange },
  })
  revalidatePath("/configuracion")
  return { ok: true, userEmail: target.email, userName: target.name, forceChange }
}
