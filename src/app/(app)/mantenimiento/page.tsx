import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/format"
import { CATEGORIES, PRIORITIES, TICKET_STATUSES } from "@/lib/schemas/maintenance"
import { Wrench, Plus, AlertTriangle } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  REPORTED: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-500",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-amber-600",
  HIGH: "text-orange-600",
  URGENT: "text-destructive",
}

export default async function MantenimientoPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string

  const tickets = await prisma.maintenanceRequest.findMany({
    where: { organizationId: orgId },
    include: { property: true, assignedTo: true },
    orderBy: [{ reportedAt: "desc" }],
  })

  const open = tickets.filter((t) => !["COMPLETED", "CANCELLED"].includes(t.status))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Mantenimiento" description={`${open.length} tickets abiertos · ${tickets.length} total`}>
        <Button asChild>
          <Link href="/mantenimiento/nuevo"><Plus className="size-4 mr-1" />Nuevo ticket</Link>
        </Button>
      </PageHeader>

      {/* Kanban */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {["REPORTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].map((status) => {
          const cols = tickets.filter((t) => t.status === status)
          return (
            <div key={status}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{TICKET_STATUSES[status]}</span>
                <span className="text-xs tabular-nums bg-muted rounded-full px-2 py-0.5">{cols.length}</span>
              </div>
              <div className="space-y-2">
                {cols.slice(0, 5).map((t) => (
                  <Link key={t.id} href={`/mantenimiento/${t.id}`}>
                    <Card className="p-3 hover:border-foreground/20 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{t.ticketNumber}</span>
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>
                          {t.priority === "URGENT" && <AlertTriangle className="size-3 inline mr-0.5" />}
                          {PRIORITIES[t.priority]}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-2 mb-1">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.property.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{CATEGORIES[t.category]}</p>
                    </Card>
                  </Link>
                ))}
                {cols.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground py-1">+{cols.length - 5} mas</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Full list */}
      <h2 className="font-display text-lg mb-3">Todos los tickets</h2>
      {tickets.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="Sin tickets" description="Crea el primer ticket de mantenimiento." action={{ label: "Nuevo ticket", href: "/mantenimiento/nuevo" }} /></Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/mantenimiento/${t.id}`}>
              <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-muted-foreground">{t.ticketNumber}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{TICKET_STATUSES[t.status]}</span>
                    </div>
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.property.name} · {CATEGORIES[t.category]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{PRIORITIES[t.priority]}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(t.reportedAt)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
