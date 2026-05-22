import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/ui/page-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatGTQ, formatDate } from "@/lib/format"
import { IncomeExpenseChart } from "./_charts"
import { buildCsv, csvDataUrl } from "@/lib/csv-export"
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns"
import { getAccessiblePropertyIds } from "@/lib/permissions"

export default async function ReportesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const accessibleIds = await getAccessiblePropertyIds({
    id: session.user.id, role: session.user.role, organizationId: orgId,
  })
  const byPropertyId = accessibleIds !== null ? { propertyId: { in: accessibleIds } } : {}
  const paymentByContractProperty = accessibleIds !== null
    ? { contract: { propertyId: { in: accessibleIds } } } : {}

  const now = new Date()

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    return { label: format(d, "MMM yy"), start: startOfMonth(d), end: endOfMonth(d) }
  })

  const [payments, expenses, contracts, tickets, projects, vendorInvoices, approvalRequests, pettyCashes] = await Promise.all([
    prisma.payment.findMany({ where: { organizationId: orgId, ...paymentByContractProperty }, orderBy: { paymentDate: "desc" } }),
    prisma.expense.findMany({ where: { organizationId: orgId, ...byPropertyId }, orderBy: { date: "desc" } }),
    prisma.contract.findMany({
      where: { organizationId: orgId, status: "ACTIVE", ...byPropertyId },
      include: { tenant: true, property: true },
      orderBy: { endDate: "asc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId, ...byPropertyId },
      include: { property: { select: { name: true } } },
      orderBy: { reportedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, ...byPropertyId },
      include: { property: { select: { name: true } }, partidas: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorInvoice.findMany({
      // VendorInvoice tiene propertyId opcional — si user restringido, requerir match
      where: { organizationId: orgId, ...(accessibleIds !== null ? { propertyId: { in: accessibleIds } } : {}) },
      include: { vendor: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.approvalRequest.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.pettyCash.findMany({
      where: { organizationId: orgId, ...byPropertyId },
      include: { property: { select: { name: true } }, movements: { orderBy: { date: "desc" } } },
    }),
  ])

  // Chart data
  const chartData = months.map(m => ({
    label: m.label,
    income: payments.filter(p => p.paymentDate >= m.start && p.paymentDate <= m.end).reduce((s, p) => s + p.amount, 0),
    expense: expenses.filter(e => e.date >= m.start && e.date <= m.end).reduce((s, e) => s + e.amount, 0),
  }))

  // KPIs
  const totalIncome = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const openTickets = tickets.filter(t => !["COMPLETED", "CANCELLED"].includes(t.status))
  const expiringIn60 = contracts.filter(c => {
    const diff = (new Date(c.endDate).getTime() - now.getTime()) / 86400000
    return diff >= 0 && diff <= 60
  })
  const pendingInvoices = vendorInvoices.filter(i => i.status === "PENDING")
  const pendingApprovals = approvalRequests.filter(a => ["PENDING", "PENDING_COSIGN"].includes(a.status))
  const totalPettyCash = pettyCashes.reduce((s, pc) => s + pc.balance, 0)

  // Maintenance by category
  const { CATEGORIES } = await import("@/lib/schemas/maintenance")
  const catCounts: Record<string, number> = {}
  for (const t of openTickets) catCounts[t.category] = (catCounts[t.category] ?? 0) + 1

  // Property income
  const propertyIncome: Record<string, { name: string; amount: number }> = {}
  for (const p of payments) {
    if (p.contractId) {
      const contract = contracts.find(c => c.id === p.contractId)
      if (contract) {
        const key = contract.property.name
        propertyIncome[key] = { name: key, amount: (propertyIncome[key]?.amount ?? 0) + p.amount }
      }
    }
  }

  // CSVs
  const incomeCsv = csvDataUrl(buildCsv([
    ["Fecha", "Propiedad", "Inquilino", "Monto"],
    ...payments.map(p => {
      const c = contracts.find(ct => ct.id === p.contractId)
      return [formatDate(p.paymentDate), c?.property.name ?? "—", c?.tenant.fullName ?? "—", p.amount]
    }),
  ]))

  const maintenanceCsv = csvDataUrl(buildCsv([
    ["Ticket", "Propiedad", "Categoria", "Estado", "Costo estimado", "Costo real", "Fecha"],
    ...tickets.map(t => [t.ticketNumber, t.property.name, CATEGORIES[t.category] ?? t.category, t.status, t.estimatedCost ?? "", t.actualCost ?? "", formatDate(t.reportedAt)]),
  ]))

  const projectsCsv = csvDataUrl(buildCsv([
    ["Proyecto", "Propiedad", "Estado", "Presupuesto", "Avance %"],
    ...projects.map(p => [p.name, p.property?.name ?? "—", p.status, p.budgetEstimate ?? "", p.progressPercent]),
  ]))

  const vendorInvoicesCsv = csvDataUrl(buildCsv([
    ["Proveedor", "No. Factura", "Fecha", "Total", "Estado", "Saldo"],
    ...vendorInvoices.map(i => [i.vendor.name, i.invoiceNumber, formatDate(i.date), i.total, i.status, i.balance]),
  ]))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Reportes" description="Resumen financiero y operacional." />

      {/* KPIs */}
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Caja chica total</p>
          <p className="font-display text-xl tabular-nums">{formatGTQ(totalPettyCash)}</p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6 mb-6">
        <h2 className="font-medium text-sm mb-4">Ingresos vs Egresos (6 meses)</h2>
        <IncomeExpenseChart data={chartData} />
      </Card>

      <Tabs defaultValue="mantenimiento">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
          <TabsTrigger value="cajachica">Caja Chica</TabsTrigger>
          <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
          <TabsTrigger value="proveedores">Pagos Proveedores</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos por propiedad</TabsTrigger>
          <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
          <TabsTrigger value="autorizaciones">Autorizaciones</TabsTrigger>
        </TabsList>

        {/* MANTENIMIENTO */}
        <TabsContent value="mantenimiento">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-sm">Tickets de mantenimiento</h2>
              <a href={maintenanceCsv} download="mantenimiento.csv" className="text-xs text-muted-foreground hover:text-foreground underline">
                Exportar CSV
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Tickets abiertos</p>
                <p className="text-2xl font-display">{openTickets.length}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Costo total estimado</p>
                <p className="text-2xl font-display">{formatGTQ(tickets.reduce((s, t) => s + (t.estimatedCost ?? 0), 0))}</p>
              </Card>
            </div>
            <div className="space-y-2">
              {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{CATEGORIES[cat] ?? cat}</span>
                    <span className="tabular-nums">{count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-amber-400 rounded-full h-1.5" style={{ width: `${openTickets.length > 0 ? (count / openTickets.length) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* CAJA CHICA */}
        <TabsContent value="cajachica">
          <Card className="p-6">
            <h2 className="font-medium text-sm mb-4">Estado de caja chica por propiedad</h2>
            <div className="space-y-3">
              {pettyCashes.map(pc => {
                const expenses = pc.movements.filter(m => m.type === "EXPENSE").reduce((s, m) => s + m.amount, 0)
                const replenishments = pc.movements.filter(m => m.type === "REPLENISHMENT").reduce((s, m) => s + m.amount, 0)
                const pct = pc.maxBalance > 0 ? Math.min(100, (pc.balance / pc.maxBalance) * 100) : 0
                return (
                  <div key={pc.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium text-sm">{pc.property.name}</p>
                      <p className={`text-sm font-medium tabular-nums ${pc.balance < 200 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatGTQ(pc.balance)}
                      </p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                      <div className={`h-1.5 rounded-full ${pc.balance < 200 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Gastos: {formatGTQ(expenses)}</span>
                      <span>Reposiciones: {formatGTQ(replenishments)}</span>
                      <span>Mov: {pc.movements.length}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        {/* PROYECTOS */}
        <TabsContent value="proyectos">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-sm">Proyectos</h2>
              <a href={projectsCsv} download="proyectos.csv" className="text-xs text-muted-foreground hover:text-foreground underline">Exportar CSV</a>
            </div>
            <div className="space-y-3">
              {projects.map(p => {
                const approvedTotal = p.partidas.reduce((s, pa) => s + (pa.amountApproved ?? 0), 0)
                const paidTotal = p.partidas.reduce((s, pa) => s + pa.amountPaid, 0)
                return (
                  <div key={p.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.property?.name ?? "—"}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-muted-foreground">{p.status}</p>
                        <p>{p.progressPercent}% avance</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                      <div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${p.progressPercent}%` }} />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Presupuesto: {p.budgetEstimate ? formatGTQ(p.budgetEstimate) : "—"}</span>
                      <span>Aprobado: {formatGTQ(approvedTotal)}</span>
                      <span>Pagado: {formatGTQ(paidTotal)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        {/* PAGOS PROVEEDORES */}
        <TabsContent value="proveedores">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-sm">Facturas de proveedores</h2>
              <div className="flex items-center gap-3">
                <Link href="/reportes/estados-cuenta" className="text-xs bg-foreground text-background px-3 py-1.5 rounded-md hover:bg-foreground/80 transition-colors">
                  Estados de cuenta →
                </Link>
                <a href={vendorInvoicesCsv} download="facturas-proveedores.csv" className="text-xs text-muted-foreground hover:text-foreground underline">Exportar CSV</a>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                <p className="text-xl font-display">{pendingInvoices.length}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Saldo total</p>
                <p className="text-xl font-display text-amber-600">{formatGTQ(pendingInvoices.reduce((s, i) => s + i.balance, 0))}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Total pagado</p>
                <p className="text-xl font-display text-emerald-600">{formatGTQ(vendorInvoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.paidAmount, 0))}</p>
              </Card>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorInvoices.slice(0, 20).map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">{i.vendor.name}</TableCell>
                    <TableCell className="text-sm font-mono">{i.invoiceNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(i.date)}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatGTQ(i.total)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${i.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {i.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* INGRESOS POR PROPIEDAD */}
        <TabsContent value="ingresos">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-sm">Ingresos por propiedad</h2>
              <a href={incomeCsv} download="ingresos.csv" className="text-xs text-muted-foreground hover:text-foreground underline">Exportar CSV</a>
            </div>
            <div className="space-y-3">
              {Object.values(propertyIncome).sort((a, b) => b.amount - a.amount).map(pi => (
                <div key={pi.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{pi.name}</span>
                    <span className="tabular-nums font-medium">{formatGTQ(pi.amount)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-emerald-500 rounded-full h-1.5" style={{ width: `${totalIncome > 0 ? (pi.amount / totalIncome) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {Object.keys(propertyIncome).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin pagos registrados por propiedad.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* VENCIMIENTOS */}
        <TabsContent value="vencimientos">
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
        </TabsContent>

        {/* AUTORIZACIONES */}
        <TabsContent value="autorizaciones">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-sm">Solicitudes de autorizacion</h2>
              <Link href="/reportes/autorizaciones" className="text-xs bg-foreground text-background px-3 py-1.5 rounded-md hover:bg-foreground/80 transition-colors">
                Auditoría completa →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                <p className="text-xl font-display text-amber-600">{pendingApprovals.length}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Aprobadas</p>
                <p className="text-xl font-display text-emerald-600">{approvalRequests.filter(a => a.status === "APPROVED").length}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Rechazadas</p>
                <p className="text-xl font-display text-red-600">{approvalRequests.filter(a => a.status === "REJECTED").length}</p>
              </Card>
            </div>
            <div className="space-y-2">
              {approvalRequests.slice(0, 15).map(a => (
                <div key={a.id} className="flex justify-between items-center text-sm border rounded p-3">
                  <div>
                    <p className="font-medium">{a.title ?? a.entityType}</p>
                    <p className="text-xs text-muted-foreground">{a.entityType} · {formatDate(a.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    {a.amount != null && <p className="text-sm tabular-nums">{formatGTQ(a.amount)}</p>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
                      a.status === "REJECTED" ? "bg-red-50 text-red-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>{a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
