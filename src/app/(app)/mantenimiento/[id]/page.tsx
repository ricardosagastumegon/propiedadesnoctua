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
import { PaymentModeSelector } from "./_payment-mode-selector"
import { DeleteTicketButton } from "./_delete-button"
import { QuoteSection } from "./_quote-section"
import { PaymentSection } from "./_payment-section"
import { EscalateButton } from "./_escalate-button"
import { TICKET_AUTH_THRESHOLD, TICKET_PROJECT_THRESHOLD } from "../constants"
import { getPrepaymentCap } from "@/lib/service-acceptance"
import { computeTicketState } from "@/lib/ticket-state"
import { getVendorsForOrg } from "@/lib/vendors"
import { assertPropertyAccess } from "@/lib/permissions"
import {
  AlertTriangle, Building2, Calendar, User, Phone, Wrench,
  Clock, CheckCircle2, FolderKanban, Wallet, ShieldCheck, ShieldAlert, ShieldX, Shield, Download,
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
  PROVEEDOR: "Proveedor (cotización)",
  CONTADO: "Contado (100% en un solo pago)",
  EFECTIVO_RESPONSABLE: "Efectivo responsable",
  REEMBOLSO: "Reembolso",
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = session.user.organizationId
  const authorityPolicy = session.user.authorityPolicy
  const { id } = await params

  const ticket = await prisma.maintenanceRequest.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: true,
      assignedTo: true,
      vendor: { select: { id: true, name: true, phone: true } },
      ticketQuotes: {
        include: {
          vendor: { select: { id: true, name: true, phone: true, rating: true } },
          items: { orderBy: { orderIndex: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      ticketPayments: { include: { vendor: { select: { id: true, name: true } } }, orderBy: { date: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      escalatedProject: { select: { id: true, name: true } },
    },
  })
  if (!ticket) notFound()
  await assertPropertyAccess(
    { id: session.user.id, role: session.user.role, organizationId: orgId },
    ticket.propertyId,
  )

  const [employees, vendors, approvalRequest, ticketAcceptance, cap] = await Promise.all([
    prisma.user.findMany({ where: { organizationId: orgId, isActive: true }, orderBy: { name: "asc" } }),
    getVendorsForOrg(orgId),
    prisma.approvalRequest.findFirst({
      where: { entityType: "TICKET", entityId: ticket.id, organizationId: orgId },
      include: {
        requestedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        rejectedBy: { select: { name: true } },
        cosigner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceAcceptance.findFirst({
      where: { organizationId: orgId, entityType: "TICKET", entityId: ticket.id, status: { in: ["PENDING", "ACCEPTED"] } },
      include: { acceptedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getPrepaymentCap(orgId),
  ])

  const acceptanceCtx = {
    cap,
    hasAcceptance: ticketAcceptance?.status === "ACCEPTED",
    acceptanceStatus: (ticketAcceptance?.status as any) ?? null,
    acceptedByName: ticketAcceptance?.acceptedBy?.name ?? null,
    acceptedAt: ticketAcceptance?.acceptedAt?.toISOString() ?? null,
    acceptanceId: ticketAcceptance?.id ?? null,
  }

  // Auto-computed ticket state
  const computedState = computeTicketState({
    status: ticket.status,
    assignedToId: ticket.assignedToId,
    paymentMode: ticket.paymentMode,
    amountPaid: ticket.amountPaid,
    totalAmount: ticket.totalAmount,
    completedAt: ticket.completedAt,
    escalatedToProjectId: ticket.escalatedToProjectId,
    hasApprovalPending: !!approvalRequest && ["PENDING", "PENDING_COSIGN"].includes(approvalRequest.status),
    hasApprovalApproved: approvalRequest?.status === "APPROVED",
    hasAcceptancePending: ticketAcceptance?.status === "PENDING",
    hasAcceptanceAccepted: ticketAcceptance?.status === "ACCEPTED",
    prepaymentCapPercentage: cap,
  })

  const canApprove = authorityPolicy === "ALONE" || authorityPolicy === "COSIGN_REQUIRED"
  const hasSelectedQuote = ticket.ticketQuotes.some(q => q.status === "SELECTED")
  const maxQuoteAmount = ticket.ticketQuotes.length > 0 ? Math.max(...ticket.ticketQuotes.map(q => q.total)) : 0
  const forceEscalate = maxQuoteAmount >= TICKET_PROJECT_THRESHOLD

  const selectedQuotes = ticket.ticketQuotes.filter(q => q.status === "SELECTED")
  const totalCotizado = selectedQuotes.length > 0
    ? selectedQuotes.reduce((s, q) => s + q.total, 0)
    : null
  const totalRef = totalCotizado ?? ticket.totalAmount
  const saldoPendiente = totalRef != null ? Math.max(0, totalRef - ticket.amountPaid) : null
  const pagosPct = totalRef && totalRef > 0 ? Math.min(100, Math.round((ticket.amountPaid / totalRef) * 100)) : 0

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
          <Link href={`/mantenimiento/${ticket.id}/pdf`} target="_blank">
            <button className="inline-flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
              <Download className="size-3.5" />PDF
            </button>
          </Link>
          {!ticket.escalatedToProjectId && !hasSelectedQuote && forceEscalate && (
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
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${computedState.color}`}
                    title={computedState.reason}
                  >
                    {computedState.label}
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

              {/* Payment mode selector */}
              <PaymentModeSelector ticketId={ticket.id} current={ticket.paymentMode} />

              {/* Cost closure form */}
              <CostForm
                ticketId={ticket.id}
                actualCost={ticket.actualCost}
                resolutionNotes={ticket.resolutionNotes}
              />
            </TabsContent>

            <TabsContent value="cotizaciones">
              <Card className="p-6">
                <h3 className="font-medium text-sm mb-4">Cotizaciones</h3>
                <QuoteSection
                  ticketId={ticket.id}
                  ticketTitle={ticket.title}
                  quotes={ticket.ticketQuotes}
                  vendors={vendors}
                  canApprove={canApprove}
                  escalated={!!ticket.escalatedToProjectId}
                  authThreshold={TICKET_AUTH_THRESHOLD}
                  projectThreshold={TICKET_PROJECT_THRESHOLD}
                  approvalPending={!!approvalRequest && ["PENDING", "PENDING_COSIGN"].includes(approvalRequest.status)}
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
                  selectedQuotes={ticket.ticketQuotes.filter(q => q.status === "SELECTED")}
                  acceptanceCtx={acceptanceCtx}
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
              {totalRef != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total cotizado</span>
                  <span className="font-medium">{formatGTQ(totalRef)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado</span>
                <span className="font-medium text-emerald-600">{formatGTQ(ticket.amountPaid)}</span>
              </div>
              {saldoPendiente != null && saldoPendiente > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo pendiente</span>
                  <span className="font-medium text-amber-600">{formatGTQ(saldoPendiente)}</span>
                </div>
              )}
              {ticket.actualCost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo real</span>
                  <span className="font-medium">{formatGTQ(ticket.actualCost)}</span>
                </div>
              )}
              {totalRef != null && totalRef > 0 && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Pagado {pagosPct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`rounded-full h-1.5 transition-all ${pagosPct >= 100 ? "bg-emerald-500" : "bg-foreground"}`}
                      style={{ width: `${pagosPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Autorización */}
          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" /> Autorización
            </h3>
            {!approvalRequest ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span>No requiere autorización</span>
              </div>
            ) : approvalRequest.status === "APPROVED" ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <ShieldCheck className="size-4 shrink-0" /> Aprobada
                </div>
                {approvalRequest.approvedBy && (
                  <p className="text-xs text-muted-foreground">Por {approvalRequest.approvedBy.name}</p>
                )}
                {approvalRequest.approvedAt && (
                  <p className="text-xs text-muted-foreground">{formatDate(approvalRequest.approvedAt)}</p>
                )}
              </div>
            ) : approvalRequest.status === "REJECTED" ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <ShieldX className="size-4 shrink-0" /> Rechazada
                </div>
                {approvalRequest.rejectedBy && (
                  <p className="text-xs text-muted-foreground">Por {approvalRequest.rejectedBy.name}</p>
                )}
                {approvalRequest.rejectionReason && (
                  <p className="text-xs text-muted-foreground italic">{approvalRequest.rejectionReason}</p>
                )}
              </div>
            ) : approvalRequest.status === "PENDING_COSIGN" ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <ShieldAlert className="size-4 shrink-0" /> Pendiente de co-firma
                </div>
                <p className="text-xs text-muted-foreground">
                  Solicitado por {approvalRequest.requestedBy.name}
                </p>
                {approvalRequest.cosigner && (
                  <p className="text-xs text-muted-foreground">
                    Co-firmante: {approvalRequest.cosigner.name}
                  </p>
                )}
                {approvalRequest.amount != null && (
                  <p className="text-xs font-medium">{formatGTQ(approvalRequest.amount)}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <ShieldAlert className="size-4 shrink-0" /> Pendiente
                </div>
                <p className="text-xs text-muted-foreground">
                  Solicitado por {approvalRequest.requestedBy.name}
                </p>
                {approvalRequest.amount != null && (
                  <p className="text-xs font-medium">{formatGTQ(approvalRequest.amount)}</p>
                )}
                {formatDate(approvalRequest.createdAt) && (
                  <p className="text-xs text-muted-foreground">{formatDate(approvalRequest.createdAt)}</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
