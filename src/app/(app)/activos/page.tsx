import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { formatGTQ, formatDate } from "@/lib/format"
import { ASSET_CATEGORIES, ASSET_STATUSES, ASSET_STATUS_COLORS } from "@/lib/schemas/asset"
import { Package, Plus, AlertTriangle } from "lucide-react"

export default async function ActivosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId

  const assets = await prisma.asset.findMany({
    where: { organizationId: orgId },
    include: { property: true, serviceLogs: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  })

  const today = new Date()
  const soon = assets.filter(a => {
    const last = a.serviceLogs[0]
    if (!last?.nextServiceAt) return false
    const diff = (new Date(last.nextServiceAt).getTime() - today.getTime()) / 86400000
    return diff <= 30
  })

  const byCategory = Object.keys(ASSET_CATEGORIES).map(cat => ({
    cat,
    count: assets.filter(a => a.category === cat).length,
  })).filter(x => x.count > 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Activos" description={`${assets.length} activos registrados`}>
        <Button asChild>
          <Link href="/activos/nuevo"><Plus className="size-4 mr-1" />Nuevo activo</Link>
        </Button>
      </PageHeader>

      {soon.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Servicios proximos</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {soon.map(a => a.name).join(", ")} — requieren servicio en los proximos 30 dias.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {byCategory.map(({ cat, count }) => (
          <Card key={cat} className="p-3">
            <p className="text-xs text-muted-foreground">{ASSET_CATEGORIES[cat]}</p>
            <p className="font-display text-2xl tabular-nums mt-1">{count}</p>
          </Card>
        ))}
      </div>

      {assets.length === 0 ? (
        <Card><EmptyState icon={Package} title="Sin activos" description="Registra el primer activo." action={{ label: "Nuevo activo", href: "/activos/nuevo" }} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map(a => {
            const lastLog = a.serviceLogs[0]
            const daysToService = lastLog?.nextServiceAt
              ? Math.ceil((new Date(lastLog.nextServiceAt).getTime() - today.getTime()) / 86400000)
              : null
            const serviceAlert = daysToService !== null && daysToService <= 30

            return (
              <Link key={a.id} href={`/activos/${a.id}`}>
                <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ASSET_STATUS_COLORS[a.status]}`}>
                      {ASSET_STATUSES[a.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">{ASSET_CATEGORIES[a.category]}</span>
                  </div>
                  <p className="font-medium">{a.name}</p>
                  {(a.brand || a.model) && (
                    <p className="text-xs text-muted-foreground mt-0.5">{[a.brand, a.model].filter(Boolean).join(" ")}</p>
                  )}
                  {a.property && <p className="text-xs text-muted-foreground mt-1">{a.property.name}</p>}
                  {a.currentValue != null && (
                    <p className="text-sm font-medium mt-2">{formatGTQ(a.currentValue)}</p>
                  )}
                  {serviceAlert && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="size-3" />
                      Servicio en {daysToService} {daysToService === 1 ? "dia" : "dias"}
                    </div>
                  )}
                  {lastLog && (
                    <p className="text-xs text-muted-foreground mt-1">Ultimo servicio: {formatDate(lastLog.date)}</p>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
