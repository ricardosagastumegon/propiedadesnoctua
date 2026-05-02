import { prisma } from "@/lib/prisma"

export interface VendorStatementLine {
  id: string
  source: "PARTIDA" | "TICKET" | "INVOICE"
  label: string
  propertyName: string | null
  date: string
  committed: number
  paid: number
  balance: number
  status: string
}

export interface VendorPaymentLine {
  id: string
  source: "PARTIDA" | "TICKET"
  label: string
  amount: number
  method: string
  date: string
  type: string | null
  percentageOfTotal: number | null
  closesWithDiscount: boolean
  discountAmount: number | null
}

export interface VendorStatement {
  totalCommitted: number
  totalPaid: number
  totalBalance: number
  commitments: VendorStatementLine[]
  payments: VendorPaymentLine[]
  nextDueDate: string | null
}

export async function getVendorStatement(vendorId: string, orgId: string): Promise<VendorStatement> {
  const [partidas, tickets, invoices] = await Promise.all([
    prisma.projectPartida.findMany({
      where: { vendorId, project: { organizationId: orgId } },
      include: {
        project: { include: { property: { select: { name: true } } } },
        payments: { orderBy: { date: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { vendorId, organizationId: orgId },
      include: {
        ticketPayments: { orderBy: { date: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorInvoice.findMany({
      where: { vendorId, organizationId: orgId },
      include: { property: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
  ])

  const commitments: VendorStatementLine[] = []
  const payments: VendorPaymentLine[] = []

  for (const p of partidas) {
    const committed = p.amountApproved ?? 0
    const paid = p.amountPaid ?? 0
    commitments.push({
      id: p.id,
      source: "PARTIDA",
      label: `${p.name} — ${p.project.name}`,
      propertyName: p.project.property?.name ?? null,
      date: p.createdAt.toISOString(),
      committed,
      paid,
      balance: committed - paid,
      status: p.status,
    })
    for (const pay of p.payments) {
      payments.push({
        id: pay.id,
        source: "PARTIDA",
        label: `${p.name} — ${p.project.name}`,
        amount: pay.amount,
        method: pay.method,
        date: pay.date.toISOString(),
        type: pay.type,
        percentageOfTotal: pay.percentageOfTotal,
        closesWithDiscount: pay.closesWithDiscount,
        discountAmount: pay.discountAmount,
      })
    }
  }

  for (const t of tickets) {
    const committed = t.estimatedCost ?? 0
    const paid = t.amountPaid ?? 0
    commitments.push({
      id: t.id,
      source: "TICKET",
      label: `Ticket #${t.ticketNumber} — ${t.title}`,
      propertyName: null,
      date: t.createdAt.toISOString(),
      committed,
      paid,
      balance: committed - paid,
      status: t.status,
    })
    for (const pay of t.ticketPayments) {
      payments.push({
        id: pay.id,
        source: "TICKET",
        label: `Ticket #${t.ticketNumber} — ${t.title}`,
        amount: pay.amount,
        method: pay.method,
        date: pay.date.toISOString(),
        type: null,
        percentageOfTotal: pay.percentageOfTotal,
        closesWithDiscount: pay.closesWithDiscount,
        discountAmount: pay.discountAmount,
      })
    }
  }

  for (const inv of invoices) {
    commitments.push({
      id: inv.id,
      source: "INVOICE",
      label: `Factura ${inv.invoiceNumber}`,
      propertyName: inv.property?.name ?? null,
      date: inv.date.toISOString(),
      committed: inv.total,
      paid: inv.total - inv.balance,
      balance: inv.balance,
      status: inv.status,
    })
  }

  const totalCommitted = commitments.reduce((s, c) => s + c.committed, 0)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  const nextDue = invoices
    .filter(i => i.dueDate && i.balance > 0)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0]

  return {
    totalCommitted,
    totalPaid,
    totalBalance: totalCommitted - totalPaid,
    commitments: commitments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    payments: payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    nextDueDate: nextDue?.dueDate?.toISOString() ?? null,
  }
}
