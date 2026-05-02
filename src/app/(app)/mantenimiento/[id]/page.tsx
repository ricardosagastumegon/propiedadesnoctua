import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/ui/page-header"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { BackButton } from "@/components/shared/back-button"
import { formatDate, formatGTQ } from "@/lib/format"
import { CATEGORIES, PRIORITIES, TICKET_STATUSES } from "@/lib/schemas/maintenance"
import { StatusActions } from "./_status-actions"
import { CostForm } from "./_cost-form"
import { DeleteTicketButton } from "./_delete-button"
import { QuoteSection } from "./_quote-section"
import { PaymentSection } from "./_payment-section"
import { EscalateButton } from "./_escalate-button"
import {
  AlertTriangle, Building2, Calendar, User, Phone, Wrench,
  Clock, CheckCircle2, FolderKanban, Wallet,
} from "lucide-react"

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

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CAJA_CHICA: "Caja Chica",
  PROVEEDOR: "Proveedor (cotizacion)",
  EFECTIVO_RESPONSABLE: "Efectivo responsable",
  REEMBOLSO: "Reembolso",
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const authorityPolicy = (session.user as any).authorityPolicy as string
  const { id } = await params

  const ticket = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: true,
      assignedTo: true,
      vendor: { select: { id: true, name: true, phone: true } },
      ticketQuotes: { include: { vendor: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      ticketPayments: { orderBy: { date: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      escalatedProject: { select: { id: true, name: true } },
    },
  })
  if (!ticket) notFound()

  const employees = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { name: "asc" },
  })
  const vendors = await prisma.vendor.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const canApprove = authorityPolicy === "ALONE" || authorityPolicy === "COSIGN_REQUIRED"
  const hasMultipleQuotes = ticket.ticketQuotes.length >= 2

  const timelineSteps = [
    { label: "Reportado", date: ticket.reportedAt, done: true },
    { label: "Asignado", date: ticket.assignedAt, done: !!ticket.assignedAt },
    { label: "En progreso", date: ticket.startedAt, done: !!ticket.startedAt },
    { label: "Completado", date: ticket.completedAt, done: !!ticket.completedAt },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <BackButton href="/mantenimiento" label="Mantenimiento" />
      <Breadcrumb items={[
        { label: "Mantenimiento", href: "/mantenimiento" },
        { label: ticket.ticketNumber },
      ]} />

      <PageHeader title={ticket.title} description={`${ticket.ticketNumber} — ${ticket.property.name}`}>
        <div className="flex items-center gap-2">
          {hasMultipleQuotes && !ticket.escalatedToProjectId && (
            <EscalateButton ticketId={ticket.id} defaultName={ticket.title} />
          )}
          <StatusActions ticketId={ticket.id} currentStatus={ticket.status} employees={employees} />
          <DeleteTicketButton id={ticket.id} />
        </div>
      </PageHeader>

      {/* Escalated banner */}
      {ticket.escalatedProject && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 text-sm">
          <FolderKanban className="size-4 text-blue-600 shrink-0" />
          <span>Este ticket fue escalado al proyecto </span>
          <Link href={`/proyectos/${ticket.escalatedProject.id}`} className="font-medium text-blue-700 hover:underline">
            {ticket.escalatedProject.name}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Informacion</TabsTrigger>
              <TabsTrigger value="cotizaciones">
                Cotizaciones
                {ticket.ticketQuotes.length > 0 && (
                  <span className="ml-1.5 bg-muted text-foreground rounded-full text-xs px-1.5">{ticket.ticketQuotes.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pagos">
                Pagos
                {ticket.ticketPayments.length > 0 && (
                  <span className="ml-1.5 bg-muted text-foreground rounded-full text-xs px-1.5">{ticket.ticketPayments.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              {/* Status badges */}
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
                  {ticket.paymentMode && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <Wallet className="size-3" />
                      {PAYMENT_MODE_LABELS[ticket.paymentMode] ?? ticket.paymentMode}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
              </Card>

              {/* Cost closure form */}
              <CostForm
                ticketId={ticket.id}
                estimatedCost={ticket.estimatedCost}
                actualCost={ticket.actualCost}
                resolutionNotes={ticket.resolutionNotes}
              />
            </TabsContent>

            <TabsContent value="cotizaciones">
              <Card className="p-6">
                <h3 className="font-medium text-sm mb-4">Cotizaciones</h3>
                <QuoteSection
                  ticketId={ticket.id}
                  quotes={ticket.ticketQuotes}
                  vendors={vendors}
                  canApprove={canApprove}
                />
              </Card>
            </TabsContent>

            <TabsContent value="pagos">
              <Card className="p-6">
                <h3 className="font-medium text-sm mb-4">Pagos</h3>
                <PaymentSection
                  ticketId={ticket.id}
                  payments={ticket.ticketPayments}
                  totalAmount={ticket.totalAmount}
                />
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card className="p-6">
                <h3 className="font-medium text-sm mb-4">Timeline</h3>

                {/* Progress steps */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {timelineSteps.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-2 shrink-0">
                      {i > 0 && <div className={`w-8 h-px ${step.done ? "bg-foreground" : "bg-muted-foreground/30"}`} />}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`size-6 rounded-full flex items-center justify-center ${step.done ? "bg-foreground text-background" : "border-2 border-muted-foreground/30"}`}>
                          {step.done ? <CheckCircle2 className="size-3" /> : <Clock className="size-3 text-muted-foreground/30" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{step.label}</span>
                        {step.date && <span className="text-xs text-muted-foreground">{formatDate(step.date)}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detailed events */}
                {ticket.timelineEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {ticket.timelineEvents.map(ev => (
                      <div key={ev.id} className="flex gap-3 text-sm">
                        <div className="mt-1.5 size-1.5 rounded-full bg-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p>{ev.message}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(ev.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Detalles</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <Link href={`/propiedades/${ticket.propertyId}`} className="hover:underline font-medium">
                  {ticket.property.name}
                </Link>
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
              {ticket.vendor && (
                <div className="flex items-center gap-2">
                  <Wrench className="size-4 text-muted-foreground shrink-0" />
                  <span>{ticket.vendor.name}</span>
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
                <span className="text-muted-foreground">Total cotizado</span>
                <span>{ticket.totalAmount != null ? formatGTQ(ticket.totalAmount) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado</span>
                <span className="font-medium text-emerald-600">{formatGTQ(ticket.amountPaid)}</span>
              </div>
              {ticket.actualCost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo real</span>
                  <span className="font-medium">{formatGTQ(ticket.actualCost)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
