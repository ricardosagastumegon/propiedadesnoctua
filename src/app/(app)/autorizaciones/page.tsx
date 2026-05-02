import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ApprovalsClient } from "./_components/approvals-client"
import type { EnrichedItem } from "./_types"

export const dynamic = "force-dynamic"

export default async function AutorizacionesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const userId = session.user!.id!
  const orgId = (session.user as any).organizationId as string
  const authorityPolicy = ((session.user as any).authorityPolicy ?? "NONE") as string

  const allRequests = await prisma.approvalRequest.findMany({
    where: { organizationId: orgId },
    include: {
      requestedBy: { select: { id: true, name: true } },
      cosigner: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const eids = (types: string | string[]) => {
    const ts = Array.isArray(types) ? types : [types]
    return allRequests.filter(r => ts.includes(r.entityType)).map(r => r.entityId)
  }

  const quoteIds = eids("QUOTE")
  const partidaIds = eids(["PARTIDA", "PROJECT_PARTIDA"])
  const contractIds = eids("CONTRACT")
  const viIds = eids("VENDOR_INVOICE")
  const invModIds = eids("INVOICE_MODIFIED")
  const vendorIds = eids("VENDOR")
  const pcIds = eids("PETTY_CASH")
  const ticketIds = eids("TICKET")

  const [quotes, partidas, contracts, vendorInvoices, invoicesModified, vendors, pettyCashes, tickets, properties, users] =
    await Promise.all([
      quoteIds.length
        ? prisma.quote.findMany({
            where: { id: { in: quoteIds } },
            include: {
              vendor: { select: { id: true, name: true, phone: true } },
              project: { include: { property: { select: { id: true, name: true } } } },
              partida: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),

      partidaIds.length
        ? prisma.projectPartida.findMany({
            where: { id: { in: partidaIds } },
            include: {
              project: { include: { property: { select: { id: true, name: true } } } },
              vendor: { select: { id: true, name: true, phone: true } },
              approvedQuote: { select: { id: true, quoteNumber: true } },
            },
          })
        : Promise.resolve([]),

      contractIds.length
        ? prisma.contract.findMany({
            where: { id: { in: contractIds } },
            include: {
              property: { select: { id: true, name: true, city: true } },
              tenant: { select: { id: true, fullName: true, phone: true, email: true } },
            },
          })
        : Promise.resolve([]),

      viIds.length
        ? prisma.vendorInvoice.findMany({
            where: { id: { in: viIds } },
            include: {
              vendor: { select: { id: true, name: true, phone: true } },
              property: { select: { id: true, name: true } },
              project: { select: { id: true, name: true } },
              partida: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),

      invModIds.length
        ? prisma.invoice.findMany({
            where: { id: { in: invModIds } },
            include: {
              contract: {
                include: {
                  property: { select: { id: true, name: true } },
                  tenant: { select: { id: true, fullName: true, phone: true } },
                },
              },
            },
          })
        : Promise.resolve([]),

      vendorIds.length
        ? prisma.vendor.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, name: true, category: true, contactName: true, phone: true, email: true },
          })
        : Promise.resolve([]),

      pcIds.length
        ? prisma.pettyCash.findMany({
            where: { id: { in: pcIds } },
            include: { property: { select: { id: true, name: true, city: true } } },
          })
        : Promise.resolve([]),

      ticketIds.length
        ? prisma.maintenanceRequest.findMany({
            where: { id: { in: ticketIds } },
            include: {
              property: { select: { id: true, name: true } },
              vendor: { select: { id: true, name: true, phone: true } },
            },
          })
        : Promise.resolve([]),

      prisma.property.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.user.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ])

  const qMap = new Map(quotes.map(q => [q.id, q]))
  const pMap = new Map(partidas.map(p => [p.id, p]))
  const cMap = new Map(contracts.map(c => [c.id, c]))
  const viMap = new Map(vendorInvoices.map(v => [v.id, v]))
  const imMap = new Map(invoicesModified.map(i => [i.id, i]))
  const vMap = new Map(vendors.map(v => [v.id, v]))
  const pcMap = new Map(pettyCashes.map(p => [p.id, p]))
  const tMap = new Map(tickets.map(t => [t.id, t]))

  const iso = (d: Date | null | undefined) => d?.toISOString() ?? null

  const enriched: EnrichedItem[] = allRequests.map(r => {
    const request = {
      id: r.id,
      entityType: r.entityType,
      entityId: r.entityId,
      relatedId: r.relatedId,
      title: r.title,
      amount: r.amount,
      status: r.status,
      notes: r.notes,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      approvedAt: iso(r.approvedAt),
      rejectedAt: iso(r.rejectedAt),
      cosignedAt: iso(r.cosignedAt),
      requestedBy: r.requestedBy,
      cosigner: r.cosigner,
      approvedBy: r.approvedBy,
      rejectedBy: r.rejectedBy,
    }

    let entity: EnrichedItem["entity"] = { type: "UNKNOWN" }

    switch (r.entityType) {
      case "QUOTE": {
        const q = qMap.get(r.entityId)
        entity = q
          ? {
              type: "QUOTE",
              quoteNumber: q.quoteNumber,
              vendorId: q.vendorId, vendorName: q.vendor.name, vendorPhone: q.vendor.phone,
              projectId: q.project?.id ?? null, projectName: q.project?.name ?? null,
              propertyId: q.project?.property?.id ?? null, propertyName: q.project?.property?.name ?? null,
              partidaId: q.partida?.id ?? null, partidaName: q.partida?.name ?? null,
              validUntil: iso(q.validUntil), total: q.total,
            }
          : null
        break
      }
      case "PARTIDA":
      case "PROJECT_PARTIDA": {
        const p = pMap.get(r.entityId)
        entity = p
          ? {
              type: "PARTIDA",
              projectId: p.projectId, projectName: p.project.name,
              propertyId: p.project?.property?.id ?? null, propertyName: p.project?.property?.name ?? null,
              vendorId: p.vendor?.id ?? null, vendorName: p.vendor?.name ?? null, vendorPhone: p.vendor?.phone ?? null,
              budgetEstimate: p.budgetEstimate, approvedQuoteNumber: p.approvedQuote?.quoteNumber ?? null,
            }
          : null
        break
      }
      case "CONTRACT": {
        const c = cMap.get(r.entityId)
        entity = c
          ? {
              type: "CONTRACT",
              propertyId: c.propertyId, propertyName: c.property.name, propertyCity: c.property.city,
              tenantId: c.tenantId, tenantName: c.tenant.fullName,
              tenantPhone: c.tenant.phone, tenantEmail: c.tenant.email ?? null,
              startDate: c.startDate.toISOString(), endDate: c.endDate.toISOString(),
              monthlyRent: c.monthlyRent, deposit: c.deposit ?? null,
            }
          : null
        break
      }
      case "VENDOR_INVOICE": {
        const v = viMap.get(r.entityId)
        entity = v
          ? {
              type: "VENDOR_INVOICE",
              vendorId: v.vendorId, vendorName: v.vendor.name, vendorPhone: v.vendor.phone,
              invoiceNumber: v.invoiceNumber, dueDate: iso(v.dueDate),
              propertyId: v.property?.id ?? null, propertyName: v.property?.name ?? null,
              projectId: v.project?.id ?? null, projectName: v.project?.name ?? null,
              partidaId: v.partida?.id ?? null, partidaName: v.partida?.name ?? null,
              total: v.total, balance: v.balance,
            }
          : null
        break
      }
      case "INVOICE_MODIFIED": {
        const i = imMap.get(r.entityId)
        entity = i
          ? {
              type: "INVOICE_MODIFIED",
              invoiceNumber: i.number, dueDate: iso(i.dueDate),
              propertyId: i.contract?.property?.id ?? null, propertyName: i.contract?.property?.name ?? null,
              tenantId: i.contract?.tenant?.id ?? null, tenantName: i.contract?.tenant?.fullName ?? null,
              tenantPhone: i.contract?.tenant?.phone ?? null,
              modificationType: i.modificationType, modificationAmount: i.modificationAmount,
              modificationReason: i.modificationReason, total: i.total,
            }
          : null
        break
      }
      case "VENDOR": {
        const v = vMap.get(r.entityId)
        entity = v
          ? {
              type: "VENDOR",
              vendorId: v.id, name: v.name, category: v.category,
              contactName: v.contactName ?? null, phone: v.phone, email: v.email ?? null,
            }
          : null
        break
      }
      case "PETTY_CASH": {
        const p = pcMap.get(r.entityId)
        entity = p
          ? {
              type: "PETTY_CASH",
              propertyId: p.property.id, propertyName: p.property.name, propertyCity: p.property.city,
              balance: p.balance, maxBalance: p.maxBalance, balanceAfter: p.balance + (r.amount ?? 0),
            }
          : null
        break
      }
      case "TICKET": {
        const t = tMap.get(r.entityId)
        entity = t
          ? {
              type: "TICKET",
              ticketNumber: t.ticketNumber,
              propertyId: t.propertyId, propertyName: t.property.name,
              vendorId: t.vendor?.id ?? null, vendorName: t.vendor?.name ?? null, vendorPhone: t.vendor?.phone ?? null,
              paymentMode: t.paymentMode ?? null, priority: t.priority, category: t.category,
            }
          : null
        break
      }
    }

    return { request, entity }
  })

  return (
    <ApprovalsClient
      enriched={enriched}
      currentUserId={userId}
      authorityPolicy={authorityPolicy}
      properties={properties}
      users={users}
    />
  )
}
