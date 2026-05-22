"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { differenceInDays } from "date-fns"

async function getIds() {
  const session = await auth()
  if (!session) throw new Error("No autenticado")
  return {
    userId: session.user.id,
    orgId: session.user.organizationId,
  }
}

export async function markAllRead() {
  const { userId } = await getIds()
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
  revalidatePath("/notificaciones")
}

export async function markRead(id: string) {
  const { userId } = await getIds()
  await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } })
  revalidatePath("/notificaciones")
}

export async function generateNotifications() {
  const { userId, orgId } = await getIds()
  const now = new Date()
  const toCreate: { type: string; title: string; message: string; link?: string }[] = []

  // Expiring contracts (within 60 days)
  const contracts = await prisma.contract.findMany({
    where: { organizationId: orgId, status: "ACTIVE" },
    include: { tenant: true, property: true },
  })
  for (const c of contracts) {
    const days = differenceInDays(c.endDate, now)
    if (days >= 0 && days <= 60) {
      toCreate.push({
        type: "CONTRACT_EXPIRING",
        title: "Contrato por vencer",
        message: `Contrato de ${c.tenant.fullName} en ${c.property.name} vence en ${days} dias`,
        link: `/contratos/${c.id}`,
      })
    }
  }

  // Overdue invoices
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId, status: { not: "PAID" }, dueDate: { lt: now } },
    include: { contract: { include: { tenant: true, property: true } } },
  })
  for (const inv of invoices) {
    toCreate.push({
      type: "INVOICE_OVERDUE",
      title: "Factura vencida",
      message: `Factura ${inv.number} de ${inv.contract?.tenant.fullName ?? "—"} esta vencida`,
      link: `/contratos/${inv.contractId}`,
    })
  }

  // Asset service due
  const assets = await prisma.asset.findMany({
    where: { organizationId: orgId },
    include: {
      serviceLogs: { orderBy: { date: "desc" }, take: 1 },
      records: { where: { isActive: true, expiryDate: { not: null } } },
    },
  })
  for (const a of assets) {
    const last = a.serviceLogs[0]
    if (last?.nextServiceAt) {
      const days = differenceInDays(last.nextServiceAt, now)
      if (days >= 0 && days <= 30) {
        toCreate.push({
          type: "ASSET_SERVICE_DUE",
          title: "Servicio de activo proximo",
          message: `${a.name} requiere servicio en ${days} dias`,
          link: `/activos/${a.id}`,
        })
      }
    }
    // Asset record expiry
    for (const rec of a.records) {
      if (!rec.expiryDate) continue
      const days = differenceInDays(rec.expiryDate, now)
      if (days >= 0 && days <= rec.notifyDaysBefore) {
        toCreate.push({
          type: "ASSET_RECORD_EXPIRING",
          title: "Documento de activo por vencer",
          message: `${a.name}: "${rec.title}" vence en ${days} dias`,
          link: `/activos/${a.id}`,
        })
      } else if (days < 0) {
        toCreate.push({
          type: "ASSET_RECORD_EXPIRED",
          title: "Documento de activo vencido",
          message: `${a.name}: "${rec.title}" vencio hace ${Math.abs(days)} dias`,
          link: `/activos/${a.id}`,
        })
      }
    }
  }

  // Urgent maintenance tickets
  const tickets = await prisma.maintenanceRequest.findMany({
    where: { organizationId: orgId, priority: "URGENT", status: { notIn: ["COMPLETED", "CANCELLED"] } },
    include: { property: true },
  })
  for (const t of tickets) {
    toCreate.push({
      type: "TICKET_URGENT",
      title: "Ticket urgente",
      message: `${t.title} en ${t.property.name}`,
      link: `/mantenimiento/${t.id}`,
    })
  }

  if (toCreate.length > 0) {
    await prisma.notification.createMany({
      data: toCreate.map(n => ({ ...n, organizationId: orgId, userId })),
    })
  }

  revalidatePath("/notificaciones")
  return { created: toCreate.length }
}
