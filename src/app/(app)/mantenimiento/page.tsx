import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate } from "@/lib/format"
import { CATEGORIES, PRIORITIES } from "@/lib/schemas/maintenance"
import { computeTicketState, type TicketComputedState } from "@/lib/ticket-state"
import { propertyAccessWhere } from "@/lib/permissions"
import { Wrench, Plus, AlertTriangle } from "lucide-react"

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-amber-600",
  HIGH: "text-orange-600",
  URGENT: "text-destructive",
}

export default async function MantenimientoPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const user = { id: session.user.id, role: session.user.role, organizationId: orgId }
  const propFilter = await propertyAccessWhere(user)

  const [tickets, acceptances, orgSettings] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where: { organizationId: orgId, ...propFilter },
      include: {
        property: true,
        assignedTo: true,
        approvalRequest: { select: { status: true } },
      },
      orderBy: [{ reportedAt: "desc" }],
    }),
    prisma.serviceAcceptance.findMany({
      where: { organizationId: orgId, entityType: "TICKET", status: { in: ["PENDING", "ACCEPTED"] } },
      select: { entityId: true, status: true },
    }),
    prisma.organizationSettings.findUnique({ where: { organizationId: orgId }, select: { prepaymentCapPercentage: true } }),
  ])

  const cap = orgSettings?.prepaymentCapPercentage ?? 80
  const acceptanceByTicket = new Map(acceptances.map(a => [a.entityId, a.status]))

  const ticketsWithState = tickets.map(t => {
    const acceptanceStatus = acceptanceByTicket.get(t.id)
    const state = computeTicketState({
      status: t.status,
      assignedToId: t.assignedToId,
      paymentMode: t.paymentMode,
      amountPaid: t.amountPaid,
      totalAmount: t.totalAmount,
      completedAt: t.completedAt,
      escalatedToProjectId: t.escalatedToProjectId,
      hasApprovalPending: t.approvalRequest?.status === "PENDING" || t.approvalRequest?.status === "PENDING_COSIGN",
      hasApprovalApproved: t.approvalRequest?.status === "APPROVED",
      hasAcceptancePending: acceptanceStatus === "PENDING",
      hasAcceptanceAccepted: acceptanceStatus === "ACCEPTED",
      prepaymentCapPercentage: cap,
    })
    return { ...t, computed: state }
  })

  const open = ticketsWithState.filter(t => t.computed.state !== "COMPLETED" && t.computed.state !== "CANCELLED")

  // Kanban columns based on computed state
  const KANBAN: Array<{ key: TicketComputedState; label: string }> = [
    { key: "REPORTED", label: "Reportado" },
    { key: "AWAITING_APPROVAL", label: "En autorización" },
    { key: "IN_PROGRESS", label: "En progreso" },
    { key: "COMPLETED", label: "Completado" },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Mantenimiento" description={`${open.length} tickets abiertos · ${tickets.length} total`}>
        <Button asChild>
          <Link href="/mantenimiento/nuevo"><Plus className="size-4 mr-1" />Nuevo ticket</Link>
        </Button>
      </PageHeader>

      {/* Kanban — estados computados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {KANBAN.map(({ key, label }) => {
          const cols = ticketsWithState.filter(t => t.computed.state === key)
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="text-xs tabular-nums bg-muted rounded-full px-2 py-0.5">{cols.length}</span>
              </div>
              <div className="space-y-2">
                {cols.slice(0, 5).map(t => (
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
      {ticketsWithState.length === 0 ? (
        <Card><EmptyState icon={Wrench} title="Sin tickets" description="Crea el primer ticket de mantenimiento." action={{ label: "Nuevo ticket", href: "/mantenimiento/nuevo" }} /></Card>
      ) : (
        <div className="space-y-2">
          {ticketsWithState.map(t => (
            <Link key={t.id} href={`/mantenimiento/${t.id}`}>
              <Card className="p-4 hover:border-foreground/20 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-muted-foreground">{t.ticketNumber}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${t.computed.color}`} title={t.computed.reason}>
                        {t.computed.label}
                      </span>
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
