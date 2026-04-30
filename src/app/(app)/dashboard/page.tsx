import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Card } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { Building2, FileText, Wrench, TrendingUp } from "lucide-react"
import { formatGTQ } from "@/lib/format"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId

  const [propertyCount, activeContracts, openTickets] = await Promise.all([
    prisma.property.count({ where: { organizationId: orgId } }),
    prisma.contract.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.maintenanceRequest.count({
      where: {
        organizationId: orgId,
        status: { in: ["REPORTED", "ASSIGNED", "IN_PROGRESS"] },
      },
    }),
  ])

  const kpis = [
    { label: "Propiedades", value: propertyCount.toString(), icon: Building2 },
    { label: "Contratos activos", value: activeContracts.toString(), icon: FileText },
    { label: "Tickets abiertos", value: openTickets.toString(), icon: Wrench },
    { label: "Ingresos del mes", value: formatGTQ(0), icon: TrendingUp, hint: "Por configurar" },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen ejecutivo de tu portafolio.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{kpi.label}</div>
              <kpi.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="font-display text-3xl tabular-nums">{kpi.value}</div>
            {kpi.hint && <div className="text-xs text-muted-foreground mt-1">{kpi.hint}</div>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg mb-1">Actividad reciente</h2>
          <p className="text-sm text-muted-foreground mb-4">Eventos del portafolio.</p>
          <div className="text-sm text-muted-foreground py-12 text-center border border-dashed rounded-md">
            Sin actividad aun. Crea contratos, registra pagos, abre tickets.
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg mb-1">Proximos vencimientos</h2>
          <p className="text-sm text-muted-foreground mb-4">Pagos y contratos.</p>
          <div className="text-sm text-muted-foreground py-12 text-center border border-dashed rounded-md">
            Nada por vencer.
          </div>
        </Card>
      </div>
    </div>
  )
}