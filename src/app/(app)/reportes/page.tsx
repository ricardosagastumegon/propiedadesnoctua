import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatGTQ, formatDate } from "@/lib/format"
import { IncomeExpenseChart } from "./_charts"
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns"

export default async function ReportesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const now = new Date()

  // Build 6-month range
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    return { label: format(d, "MMM yy"), start: startOfMonth(d), end: endOfMonth(d) }
  })

  const [payments, expenses, contracts, tickets] = await Promise.all([
    prisma.payment.findMany({ where: { organizationId: orgId }, orderBy: { paymentDate: "desc" } }),
    prisma.expense.findMany({ where: { organizationId: orgId }, orderBy: { date: "desc" } }),
    prisma.contract.findMany({
      where: { organizationId: orgId, status: "ACTIVE", endDate: { gte: now } },
      include: { tenant: true, property: true },
      orderBy: { endDate: "asc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { property: true },
      orderBy: { reportedAt: "desc" },
    }),
  ])

  // Aggregate by month
  const chartData = months.map(m => {
    const income = payments
      .filter(p => p.paymentDate >= m.start && p.paymentDate <= m.end)
      .reduce((s, p) => s + p.amount, 0)
    const expense = expenses
      .filter(e => e.date >= m.start && e.date <= m.end)
      .reduce((s, e) => s + e.amount, 0)
    return { label: m.label, income, expense }
  })

  // Maintenance by category
  const { CATEGORIES } = await import("@/lib/schemas/maintenance")
  const catCounts: Record<string, number> = {}
  for (const t of tickets) {
    catCounts[t.category] = (catCounts[t.category] ?? 0) + 1
  }

  // Expiring contracts (next 60 days)
  const expiringIn60 = contracts.filter(c => {
    const diff = (new Date(c.endDate).getTime() - now.getTime()) / 86400000
    return diff >= 0 && diff <= 60
  })

  const totalIncome = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  // CSV export data (raw string for download link)
  const csvRows = [
    ["Fecha", "Tipo", "Concepto", "Monto"],
    ...payments.map(p => [formatDate(p.paymentDate), "Ingreso", "Pago de arrendamiento", p.amount.toFixed(2)]),
    ...expenses.map(e => [formatDate(e.date), "Egreso", e.description, e.amount.toFixed(2)]),
  ]
  const csvContent = csvRows.map(r => r.join(",")).join("\n")
  const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Reportes" description="Resumen financiero y operacional.">
        <a
          href={csvDataUrl}
          download="reporte.csv"
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
        >
          Exportar CSV
        </a>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total ingresos</p>
          <p className="font-display text-xl tabular-nums">{formatGTQ(totalIncome)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total egresos</p>
          <p className="font-display text-xl tabular-nums">{formatGTQ(totalExpenses)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Utilidad neta</p>
          <p className={`font-display text-xl tabular-nums ${totalIncome - totalExpenses < 0 ? "text-destructive" : "text-emerald-600"}`}>
            {formatGTQ(totalIncome - totalExpenses)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tickets abiertos</p>
          <p className="font-display text-xl tabular-nums">{tickets.length}</p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6 mb-6">
        <h2 className="font-medium text-sm mb-4">Ingresos vs Egresos (6 meses)</h2>
        <IncomeExpenseChart data={chartData} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring contracts */}
        <Card className="p-6">
          <h2 className="font-medium text-sm mb-4">Contratos por vencer (60 dias)</h2>
          {expiringIn60.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Ningun contrato por vencer.</p>
          ) : (
            <div className="space-y-2">
              {expiringIn60.map(c => {
                const daysLeft = Math.ceil((new Date(c.endDate!).getTime() - now.getTime()) / 86400000)
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{c.tenant.fullName}</p>
                      <p className="text-xs text-muted-foreground">{c.property.name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium ${daysLeft <= 15 ? "text-destructive" : "text-amber-600"}`}>
                        {daysLeft} dias
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(c.endDate!)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Maintenance by category */}
        <Card className="p-6">
          <h2 className="font-medium text-sm mb-4">Tickets abiertos por categoria</h2>
          {Object.keys(catCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin tickets abiertos.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{CATEGORIES[cat]}</span>
                      <span className="tabular-nums">{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-foreground rounded-full h-1.5"
                        style={{ width: `${(count / tickets.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
