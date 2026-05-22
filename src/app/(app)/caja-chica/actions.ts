"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { tryGuard } from "@/lib/action-guard"

async function getSession() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user.id,
    orgId: session.user.organizationId,
    authorityPolicy: session.user.authorityPolicy,
  }
}

export async function initPettyCash(propertyId: string) {
  const g = await tryGuard({ module: "cajaChica", action: "create", propertyId })
  if ("error" in g) throw new Error(g.error)
  const { orgId } = await getSession()
  const existing = await prisma.pettyCash.findUnique({ where: { propertyId } })
  if (existing) return existing
  const pc = await prisma.pettyCash.create({
    data: { organizationId: orgId, propertyId, balance: 0, maxBalance: 2000 },
  })
  revalidatePath("/caja-chica")
  return pc
}

export async function registerExpense(propertyId: string, formData: FormData) {
  const g = await tryGuard({ module: "cajaChica", action: "create", propertyId })
  if ("error" in g) return { error: g.error }
  const { orgId } = await getSession()
  const pc = await prisma.pettyCash.findUnique({ where: { propertyId } })
  if (!pc || pc.organizationId !== orgId) throw new Error("Caja no encontrada")

  const amount = parseFloat(formData.get("amount") as string) || 0
  const description = formData.get("description") as string
  const category = formData.get("category") as string || null
  const dateRaw = formData.get("date") as string
  const reference = formData.get("reference") as string || null
  const ticketId = formData.get("ticketId") as string || null

  if (!amount || !description || !dateRaw) return { error: "Campos requeridos" }
  if (pc.balance < amount) return { error: "Saldo insuficiente en caja chica" }

  await prisma.$transaction([
    prisma.pettyCashMovement.create({
      data: {
        pettyCashId: pc.id,
        type: "EXPENSE",
        amount,
        description,
        category: category || undefined,
        date: new Date(dateRaw),
        reference: reference || undefined,
        ticketId: ticketId || undefined,
      },
    }),
    prisma.pettyCash.update({
      where: { id: pc.id },
      data: { balance: { decrement: amount } },
    }),
  ])
  revalidatePath(`/caja-chica/${propertyId}`)
}

export async function replenishPettyCash(propertyId: string, formData: FormData) {
  const g = await tryGuard({ module: "cajaChica", action: "create", propertyId })
  if ("error" in g) return { error: g.error }
  const { orgId, userId, authorityPolicy } = await getSession()
  const pc = await prisma.pettyCash.findUnique({ where: { propertyId }, include: { property: true } })
  if (!pc || pc.organizationId !== orgId) throw new Error("Caja no encontrada")

  const amount = parseFloat(formData.get("amount") as string) || 0
  const notes = formData.get("notes") as string || null
  if (!amount) return { error: "Monto requerido" }

  if (authorityPolicy === "ALONE") {
    await prisma.$transaction([
      prisma.pettyCashMovement.create({
        data: {
          pettyCashId: pc.id,
          type: "REPLENISHMENT",
          amount,
          description: `Reposicion — ${notes || ""}`,
          date: new Date(),
        },
      }),
      prisma.pettyCash.update({ where: { id: pc.id }, data: { balance: { increment: amount } } }),
    ])
    revalidatePath(`/caja-chica/${propertyId}`)
    return { success: true }
  } else if (authorityPolicy === "COSIGN_REQUIRED") {
    await prisma.approvalRequest.create({
      data: {
        organizationId: orgId,
        requestedById: userId,
        entityType: "PETTY_CASH",
        entityId: pc.id,
        title: `Reposicion caja chica: ${pc.property.name}`,
        amount,
        notes: notes || undefined,
        status: "PENDING_COSIGN",
      },
    })
    revalidatePath(`/caja-chica/${propertyId}`)
    revalidatePath("/autorizaciones")
    return { success: true, pending: true }
  } else {
    return { error: "Sin autoridad para solicitar reposicion" }
  }
}

export async function approveReplenishment(approvalId: string, propertyId: string) {
  const g = await tryGuard({ module: "autorizaciones", action: "edit", propertyId })
  if ("error" in g) throw new Error(g.error)
  const { orgId, userId } = await getSession()
  const req = await prisma.approvalRequest.findFirst({
    where: { id: approvalId, organizationId: orgId },
  })
  if (!req || req.entityType !== "PETTY_CASH") throw new Error("Solicitud no encontrada")

  const pc = await prisma.pettyCash.findUnique({ where: { id: req.entityId } })
  if (!pc) throw new Error("Caja no encontrada")

  await prisma.$transaction([
    prisma.approvalRequest.update({
      where: { id: approvalId },
      data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
    }),
    prisma.pettyCashMovement.create({
      data: {
        pettyCashId: pc.id,
        type: "REPLENISHMENT",
        amount: req.amount ?? 0,
        description: `Reposicion aprobada — ${req.notes || ""}`,
        date: new Date(),
      },
    }),
    prisma.pettyCash.update({
      where: { id: pc.id },
      data: { balance: { increment: req.amount ?? 0 } },
    }),
  ])
  revalidatePath(`/caja-chica/${propertyId}`)
  revalidatePath("/autorizaciones")
}

export async function adjustBalance(propertyId: string, formData: FormData) {
  const g = await tryGuard({ module: "cajaChica", action: "edit", propertyId })
  if ("error" in g) return { error: g.error }
  const { orgId } = await getSession()
  const pc = await prisma.pettyCash.findUnique({ where: { propertyId } })
  if (!pc || pc.organizationId !== orgId) throw new Error("Caja no encontrada")

  const newBalance = parseFloat(formData.get("newBalance") as string)
  const notes = formData.get("notes") as string || "Ajuste manual"
  if (isNaN(newBalance)) return { error: "Saldo invalido" }

  const diff = newBalance - pc.balance
  await prisma.$transaction([
    prisma.pettyCashMovement.create({
      data: {
        pettyCashId: pc.id,
        type: "ADJUSTMENT",
        amount: Math.abs(diff),
        description: notes,
        date: new Date(),
      },
    }),
    prisma.pettyCash.update({ where: { id: pc.id }, data: { balance: newBalance } }),
  ])
  revalidatePath(`/caja-chica/${propertyId}`)
}
