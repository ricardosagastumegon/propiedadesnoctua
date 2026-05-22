import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { formatGTQ, formatDate } from "@/lib/format"
import { PROJECT_TYPES, PROJECT_STATUSES, PROJECT_STATUS_COLORS } from "@/lib/schemas/project"
import { propertyAccessWhere } from "@/lib/permissions"
import { FolderOpen, Plus } from "lucide-react"

export default async function ProyectosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const propFilter = await propertyAccessWhere({
    id: session.user.id, role: session.user.role, organizationId: orgId,
  })

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, ...propFilter },
    include: {
      property: true,
      partidas: {
        include: { payments: true },
        where: { status: { not: "CANCELLED" } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const active = projects.filter(p => p.status === "IN_PROGRESS")

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Proyectos" description={`${active.length} en progreso · ${projects.length} total`}>
        <Button asChild>
          <Link href="/proyectos/nuevo"><Plus className="size-4 mr-1" />Nuevo proyecto</Link>
        </Button>
      </PageHeader>

      {projects.length === 0 ? (
        <Card><EmptyState icon={FolderOpen} title="Sin proyectos" description="Crea el primer proyecto." action={{ label: "Nuevo proyecto", href: "/proyectos/nuevo" }} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const totalApproved = p.partidas.reduce((s, pt) => s + (pt.amountApproved ?? 0), 0)
            const totalPaid = p.partidas.reduce((s, pt) => s + pt.amountPaid, 0)
            const paidPct = totalApproved > 0 ? Math.min(100, (totalPaid / totalApproved) * 100) : 0
            const activePartidas = p.partidas.filter(pt => pt.approvedQuoteId).length

            return (
              <Link key={p.id} href={`/proyectos/${p.id}`}>
                <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_COLORS[p.status]}`}>
                      {PROJECT_STATUSES[p.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">{PROJECT_TYPES[p.type]}</span>
                  </div>
                  <p className="font-medium mb-0.5">{p.name}</p>
                  {p.property && <p className="text-xs text-muted-foreground mb-3">{p.property.name}</p>}

                  <div className="mt-auto space-y-2">
                    {/* Payment progress */}
                    {totalApproved > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{formatGTQ(totalPaid)} pagado</span>
                          <span>de {formatGTQ(totalApproved)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className={`rounded-full h-1.5 transition-all ${paidPct >= 100 ? "bg-emerald-500" : "bg-foreground"}`}
                            style={{ width: `${paidPct}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{p.partidas.length} partidas{activePartidas > 0 ? ` · ${activePartidas} activas` : ""}</span>
                      {p.endDate && <span>Fin: {formatDate(p.endDate)}</span>}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
