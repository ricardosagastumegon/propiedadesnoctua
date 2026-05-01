import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { formatDate, formatGTQ } from "@/lib/format"
import { CATEGORIES, PRIORITIES, TICKET_STATUSES } from "@/lib/schemas/maintenance"
import { StatusActions } from "./_status-actions"
import { CostForm } from "./_cost-form"
import { DeleteTicketButton } from "./_delete-button"
import { AlertTriangle, Building2, Calendar, Clock, User, Phone, DollarSign, Wrench } from "lucide-react"

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

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const { id } = await params

  const ticket = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId: orgId },
    include: { property: true, assignedTo: true },
  })
  if (!ticket) notFound()

  const employees = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { name: "asc" },
  })

  const timeline: { label: string; date: Date | null }[] = [
    { label: "Reportado", date: ticket.reportedAt },
    { label: "Asignado", date: ticket.assignedAt },
    { label: "En progreso", date: ticket.startedAt },
    { label: "Completado", date: ticket.completedAt },
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title={ticket.title}
        description={`${ticket.ticketNumber} — ${ticket.property.name}`}
      >
        <div className="flex items-center gap-2">
          <StatusActions ticketId={ticket.id} currentStatus={ticket.status} employees={employees} />
          <DeleteTicketButton id={ticket.id} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>
                {TICKET_STATUSES[ticket.status]}
              </span>
              <span className={`text-xs font-medium flex items-center gap-1 ${PRIORITY_COLORS[ticket.priority]}`}>
                {ticket.priority === "URGENT" && <AlertTriangle className="size-3" />}
                {PRIORITIES[ticket.priority]}
              </span>
              <span className="text-xs bg-muted px-2 py-1 rounded-full">{CATEGORIES[ticket.category]}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
          </Card>

          {/* Cost form */}
          <CostForm
            ticketId={ticket.id}
            estimatedCost={ticket.estimatedCost}
            actualCost={ticket.actualCost}
            resolutionNotes={ticket.resolutionNotes}
          />

          {/* Timeline */}
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Historial</h3>
            <div className="space-y-3">
              {timeline.map((step) =>
                step.date ? (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground w-24">{step.label}</span>
                    <span className="text-sm">{formatDate(step.date)}</span>
                  </div>
                ) : null
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Detalles</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <Link href={`/propiedades/${ticket.propertyId}`} className="hover:underline font-medium">
                    {ticket.property.name}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{formatDate(ticket.reportedAt)}</span>
              </div>
              {ticket.assignedTo && (
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <span>{ticket.assignedTo.name}</span>
                </div>
              )}
            </div>
          </Card>

          {(ticket.reportedBy || ticket.reportedPhone) && (
            <Card className="p-4 space-y-3">
              <h3 className="font-medium text-sm">Reportado por</h3>
              <div className="space-y-2 text-sm">
                {ticket.reportedBy && (
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground shrink-0" />
                    <span>{ticket.reportedBy}</span>
                  </div>
                )}
                {ticket.reportedPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <span>{ticket.reportedPhone}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Costos</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimado</span>
                <span>{ticket.estimatedCost != null ? formatGTQ(ticket.estimatedCost) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Real</span>
                <span className="font-medium">{ticket.actualCost != null ? formatGTQ(ticket.actualCost) : "—"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
