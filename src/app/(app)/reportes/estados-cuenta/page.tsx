import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { EstadosCuentaClient } from "./_client"

export const dynamic = "force-dynamic"

export default async function EstadosCuentaPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, category: true, phone: true },
    orderBy: { name: "asc" },
  })

  const [partidas, tickets, invoices] = await Promise.all([
    prisma.projectPartida.findMany({
      where: { project: { organizationId: orgId }, vendorId: { not: null } },
      select: {
        id: true,
        vendorId: true,
        amountApproved: true,
        amountPaid: true,
        status: true,
        payments: { select: { amount: true, date: true, percentageOfTotal: true } },
      },
    }),
    prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId, vendorId: { not: null } },
      select: {
        id: true,
        vendorId: true,
        estimatedCost: true,
        amountPaid: true,
        status: true,
        ticketPayments: { select: { amount: true, date: true } },
      },
    }),
    prisma.vendorInvoice.findMany({
      where: { organizationId: orgId },
      select: { id: true, vendorId: true, total: true, balance: true, status: true, dueDate: true },
    }),
  ])

  // Build per-vendor summary
  const map = new Map<string, {
    vendorId: string
    totalCommitted: number
    totalPaid: number
    lastPaymentDate: string | null
    overdueInvoices: number
  }>()

  function ensure(vendorId: string) {
    if (!map.has(vendorId)) map.set(vendorId, { vendorId, totalCommitted: 0, totalPaid: 0, lastPaymentDate: null, overdueInvoices: 0 })
    return map.get(vendorId)!
  }

  for (const p of partidas) {
    if (!p.vendorId) continue
    const e = ensure(p.vendorId)
    e.totalCommitted += p.amountApproved ?? 0
    e.totalPaid += p.amountPaid ?? 0
    for (const pay of p.payments) {
      const d = pay.date.toISOString()
      if (!e.lastPaymentDate || d > e.lastPaymentDate) e.lastPaymentDate = d
    }
  }
  for (const t of tickets) {
    if (!t.vendorId) continue
    const e = ensure(t.vendorId)
    e.totalCommitted += t.estimatedCost ?? 0
    e.totalPaid += t.amountPaid ?? 0
    for (const pay of t.ticketPayments) {
      const d = pay.date.toISOString()
      if (!e.lastPaymentDate || d > e.lastPaymentDate) e.lastPaymentDate = d
    }
  }
  for (const inv of invoices) {
    const e = ensure(inv.vendorId)
    e.totalCommitted += inv.total
    e.totalPaid += inv.total - inv.balance
    if (inv.balance > 0 && inv.dueDate && new Date(inv.dueDate) < new Date()) {
      e.overdueInvoices++
    }
  }

  const rows = vendors.map(v => {
    const s = map.get(v.id)
    return {
      ...v,
      totalCommitted: s?.totalCommitted ?? 0,
      totalPaid: s?.totalPaid ?? 0,
      totalBalance: (s?.totalCommitted ?? 0) - (s?.totalPaid ?? 0),
      lastPaymentDate: s?.lastPaymentDate ?? null,
      overdueInvoices: s?.overdueInvoices ?? 0,
    }
  }).filter(r => r.totalCommitted > 0 || r.totalPaid > 0)
    .sort((a, b) => b.totalBalance - a.totalBalance)

  const totals = {
    committed: rows.reduce((s, r) => s + r.totalCommitted, 0),
    paid: rows.reduce((s, r) => s + r.totalPaid, 0),
    balance: rows.reduce((s, r) => s + r.totalBalance, 0),
    overdue: rows.reduce((s, r) => s + r.overdueInvoices, 0),
  }

  return <EstadosCuentaClient rows={rows} totals={totals} />
}
