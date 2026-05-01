import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, FileText, Wrench, TrendingUp } from "lucide-react"
import { formatGTQ, formatDate } from "@/lib/format"
import { DashboardChart } from "./_chart"
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [
    propertyCount,
    occupiedCount,
    activeContracts,
    openTickets,
    monthPayments,
    monthExpenses,
    expiringContracts,
    recentPayments,
    recentTickets,
  ] = await Promise.all([
    prisma.property.count({ where: { organizationId: orgId } }),
    prisma.property.count({ where: { organizationId: orgId, status: "RENTED" } }),
    prisma.contract.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.maintenanceRequest.count({
      where: { organizationId: orgId, status: { in: ["REPORTED", "ASSIGNED", "IN_PROGRESS"] } },
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId, paymentDate: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.expense.findMany({
      where: { organizationId: orgId, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.contract.findMany({
      where: {
        organizationId: orgId,
        status: "ACTIVE",
        endDate: { gte: now, lte: new Date(now.getTime() + 60 * 86400000) },
      },
      include: { tenant: true, property: true },
      orderBy: { endDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId },
      include: { contract: { include: { tenant: true, property: true } } },
      orderBy: { paymentDate: "desc" },
      take: 5,
    }),
    prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId },
      include: { property: true },
      orderBy: { reportedAt: "desc" },
      take: 5,
    }),
  ])

  const incomeMonth = monthPayments.reduce((s, p) => s + p.amount, 0)
  const expenseMonth = monthExpenses.reduce((s, e) => s + e.amount, 0)

  // 6-month chart data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    return { label: format(d, "MMM"), start: startOfMonth(d), end: endOfMonth(d) }
  })

  const [allPayments, allExpenses] = await Promise.all([
    prisma.payment.findMany({ where: { organizationId: orgId, paymentDate: { gte: months[0].start } } }),
    prisma.expense.findMany({ where: { organizationId: orgId, date: { gte: months[0].start } } }),
  ])

  const chartData = months.map(m => ({
    label: m.label,
    income: allPayments.filter(p => p.paymentDate >= m.start && p.paymentDate <= m.end).reduce((s, p) => s + p.amount, 0),
    expense: allExpenses.filter(e => e.date >= m.start && e.date <= m.end).reduce((s, e) => s + e.amount, 0),
  }))

  const kpis = [
    { label: "Ingresos del mes", value: formatGTQ(incomeMonth), icon: TrendingUp },
    { label: "Contratos activos", value: activeContracts.toString(), icon: FileText },
    { label: "Ocupacion", value: `${occupiedCount}/${propertyCount}`, icon: Building2 },
    { label: "Tickets abiertos", value: openTickets.toString(), icon: Wrench },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen ejecutivo del portafolio.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
              <kpi.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="font-display text-2xl tabular-nums">{kpi.value}</div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="p-6 mb-6">
        <h2 className="font-medium text-sm mb-4">Ingresos vs Egresos (6 meses)</h2>
        <DashboardChart data={chartData} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring contracts */}
        <Card className="p-6">
          <h2 className="font-medium text-sm mb-4">Contratos por vencer</h2>
          {expiringContracts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Ningun contrato por vencer en 60 dias.</p>
          ) : (
            <div className="space-y-2">
              {expiringContracts.map(c => {
                const days = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / 86400000)
                return (
                  <Link key={c.id} href={`/contratos/${c.id}`}>
                    <div className="flex items-center justify-between border rounded-lg p-3 hover:border-foreground/20 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.tenant.fullName}</p>
                        <p className="text-xs text-muted-foreground">{c.property.name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${days <= 15 ? "text-destructive" : "text-amber-600"}`}>
                          {days} dias
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(c.endDate)}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="p-6">
          <h2 className="font-medium text-sm mb-4">Actividad reciente</h2>
          <div className="space-y-2">
            {recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.contract?.tenant.fullName ?? "Pago"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</p>
                </div>
                <span className="text-emerald-600 font-medium tabular-nums">+{formatGTQ(p.amount)}</span>
              </div>
            ))}
            {recentPayments.length === 0 && recentTickets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin actividad reciente.</p>
            )}
            {recentTickets.map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.property.name} — {formatDate(t.reportedAt)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{t.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
