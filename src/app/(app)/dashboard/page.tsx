import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Building2, FileText, Wrench, TrendingUp,
  ShieldAlert, FolderKanban, Clock, AlertTriangle,
  CheckCircle2, ArrowRight,
} from "lucide-react"
import { formatGTQ, formatDate } from "@/lib/format"
import { DashboardChart } from "./_chart"
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns"

const TICKET_STATUS_LABELS: Record<string, string> = {
  REPORTED: "Reportado",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
}

const TICKET_STATUS_COLORS: Record<string, string> = {
  REPORTED: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-amber-600",
  HIGH: "text-orange-600",
  URGENT: "text-destructive",
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planificación",
  IN_PROGRESS: "En ejecución",
  ON_HOLD: "En pausa",
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  ON_HOLD: "bg-gray-100 text-gray-600",
}

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
    pendingApprovals,
    recentOpenTickets,
    activeProjects,
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
      take: 5,
    }),
    prisma.approvalRequest.findMany({
      where: { organizationId: orgId, status: { in: ["PENDING", "PENDING_COSIGN"] } },
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId, status: { in: ["REPORTED", "ASSIGNED", "IN_PROGRESS"] } },
      include: { property: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
      take: 6,
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, status: { in: ["PLANNING", "IN_PROGRESS", "ON_HOLD"] } },
      include: {
        property: { select: { name: true } },
        partidas: { select: { amountApproved: true, amountPaid: true } },
      },
      orderBy: { updatedAt: "desc" },
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
    { label: "Ingresos del mes", value: formatGTQ(incomeMonth), sub: `Egresos: ${formatGTQ(expenseMonth)}`, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Ocupacion", value: `${occupiedCount} / ${propertyCount}`, sub: `${activeContracts} contratos activos`, icon: Building2, color: "text-foreground" },
    { label: "Tickets abiertos", value: openTickets.toString(), sub: "Reportados + En progreso", icon: Wrench, color: openTickets > 0 ? "text-amber-600" : "text-emerald-600" },
    { label: "Autorizaciones", value: pendingApprovals.length.toString(), sub: "Pendientes de resolver", icon: ShieldAlert, color: pendingApprovals.length > 0 ? "text-destructive" : "text-emerald-600" },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen ejecutivo del portafolio.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
              <kpi.icon className={`size-4 ${kpi.color}`} />
            </div>
            <div className={`font-display text-2xl tabular-nums ${kpi.color}`}>{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="p-6 mb-6">
        <h2 className="font-medium text-sm mb-4">Ingresos vs Egresos (6 meses)</h2>
        <DashboardChart data={chartData} />
      </Card>

      {/* Alerts row: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Contratos por vencer */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-sm flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              Contratos por vencer
            </h2>
            <Link href="/contratos" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Ver todos <ArrowRight className="size-3" />
            </Link>
          </div>
          {expiringContracts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-4">
                <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sin vencimientos en 60 días</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {expiringContracts.map(c => {
                const days = Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / 86400000)
                return (
                  <Link key={c.id} href={`/contratos/${c.id}`}>
                    <div className="flex items-center justify-between border rounded-lg p-3 hover:border-foreground/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.tenant.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.property.name}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className={`text-xs font-medium ${days <= 15 ? "text-destructive" : "text-amber-600"}`}>
                          {days}d
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

        {/* Autorizaciones pendientes */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-sm flex items-center gap-2">
              <ShieldAlert className="size-4 text-muted-foreground" />
              Autorizaciones pendientes
            </h2>
            <Link href="/autorizaciones" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </div>
          {pendingApprovals.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-4">
                <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sin pendientes</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {pendingApprovals.map(a => (
                <Link
                  key={a.id}
                  href={a.entityType === "TICKET" ? `/mantenimiento/${a.entityId}` : `/autorizaciones`}
                >
                  <div className="flex items-start justify-between border rounded-lg p-3 hover:border-foreground/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate leading-tight">{a.title ?? a.entityType}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.requestedBy.name} · {a.status === "PENDING_COSIGN" ? "Co-firma" : "Pendiente"}
                      </p>
                    </div>
                    {a.amount != null && (
                      <span className="text-sm font-medium tabular-nums shrink-0 ml-2">{formatGTQ(a.amount)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Nuevos tickets */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-sm flex items-center gap-2">
              <Wrench className="size-4 text-muted-foreground" />
              Tickets activos
            </h2>
            <Link href="/mantenimiento" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Ver todos <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentOpenTickets.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-4">
                <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sin tickets abiertos</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {recentOpenTickets.map(t => (
                <Link key={t.id} href={`/mantenimiento/${t.id}`}>
                  <div className="flex items-start justify-between border rounded-lg p-3 hover:border-foreground/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate leading-tight">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.property.name}</p>
                    </div>
                    <div className="shrink-0 ml-2 flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TICKET_STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                        {TICKET_STATUS_LABELS[t.status] ?? t.status}
                      </span>
                      {t.priority === "URGENT" && (
                        <AlertTriangle className={`size-3 ${PRIORITY_COLORS[t.priority]}`} />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Avances de proyectos */}
      {activeProjects.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-sm flex items-center gap-2">
              <FolderKanban className="size-4 text-muted-foreground" />
              Avance de proyectos
            </h2>
            <Link href="/proyectos" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              Ver todos <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjects.map(p => {
              const totalApproved = p.partidas.reduce((s, pa) => s + pa.amountApproved, 0)
              const totalPaid = p.partidas.reduce((s, pa) => s + pa.amountPaid, 0)
              const pct = totalApproved > 0
                ? Math.min(100, Math.round((totalPaid / totalApproved) * 100))
                : p.progressPercent
              return (
                <Link key={p.id} href={`/proyectos/${p.id}`}>
                  <div className="border rounded-lg p-4 hover:border-foreground/20 transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.property && <p className="text-xs text-muted-foreground truncate">{p.property.name}</p>}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${PROJECT_STATUS_COLORS[p.status] ?? "bg-muted text-muted-foreground"}`}>
                        {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{totalApproved > 0 ? `${formatGTQ(totalPaid)} / ${formatGTQ(totalApproved)}` : "Sin partidas"}</span>
                        <span className="font-medium text-foreground">{pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`rounded-full h-1.5 transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-foreground"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
