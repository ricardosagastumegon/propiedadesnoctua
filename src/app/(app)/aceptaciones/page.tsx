import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { formatGTQ, formatDate } from "@/lib/format"
import { BadgeCheck, Clock, CheckCircle2, XCircle, ArrowRight, Phone, Building2, Wrench, FolderKanban, User as UserIcon } from "lucide-react"
import { AcceptanceTabs } from "./_tabs"

export const dynamic = "force-dynamic"

interface EnrichedRow {
  id: string
  status: string
  entityType: string
  entityId: string
  projectId: string | null
  entityName: string
  vendor: { name: string; phone: string | null } | null
  amountApproved: number | null
  amountPaid: number
  projectName: string | null
  propertyName: string | null
  requestedByName: string | null
  acceptedByName: string | null
  rejectedByName: string | null
  requestedAt: string
  acceptedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  rating: number | null
  hash: string | null
}

export default async function AceptacionesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const canAcceptServices = !!(session.user as any).canAcceptServices
  const role = ((session.user as any).role ?? "VIEWER") as string
  const isOwnerOrAdmin = role === "ADMIN" || role === "OWNER"

  const acceptances = await prisma.serviceAcceptance.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      acceptedBy: { select: { name: true } },
      rejectedBy: { select: { name: true } },
    },
  })

  const partidaIds = acceptances.filter(a => a.entityType === "PARTIDA").map(a => a.entityId)
  const ticketIds = acceptances.filter(a => a.entityType === "TICKET").map(a => a.entityId)

  const [partidas, tickets] = await Promise.all([
    partidaIds.length
      ? prisma.projectPartida.findMany({
          where: { id: { in: partidaIds } },
          include: {
            project: { include: { property: { select: { name: true } } } },
            vendor: { select: { name: true, phone: true } },
          },
        })
      : Promise.resolve([]),
    ticketIds.length
      ? prisma.maintenanceRequest.findMany({
          where: { id: { in: ticketIds } },
          include: {
            property: { select: { name: true } },
            vendor: { select: { name: true, phone: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const partidaMap = new Map(partidas.map(p => [p.id, p]))
  const ticketMap = new Map(tickets.map(t => [t.id, t]))

  const rows: EnrichedRow[] = acceptances.map(a => {
    if (a.entityType === "PARTIDA") {
      const p = partidaMap.get(a.entityId)
      return {
        id: a.id,
        status: a.status,
        entityType: a.entityType,
        entityId: a.entityId,
        projectId: a.projectId,
        entityName: p?.name ?? "Partida",
        vendor: p?.vendor ?? null,
        amountApproved: p?.amountApproved ?? null,
        amountPaid: p?.amountPaid ?? 0,
        projectName: p?.project?.name ?? null,
        propertyName: p?.project?.property?.name ?? null,
        requestedByName: a.requestedBy?.name ?? null,
        acceptedByName: a.acceptedBy?.name ?? null,
        rejectedByName: a.rejectedBy?.name ?? null,
        requestedAt: a.requestedAt.toISOString(),
        acceptedAt: a.acceptedAt?.toISOString() ?? null,
        rejectedAt: a.rejectedAt?.toISOString() ?? null,
        rejectionReason: a.rejectionReason,
        rating: a.rating,
        hash: a.verificationHash,
      }
    }
    const t = ticketMap.get(a.entityId)
    return {
      id: a.id,
      status: a.status,
      entityType: a.entityType,
      entityId: a.entityId,
      projectId: a.projectId,
      entityName: t ? `${t.ticketNumber} — ${t.title}` : "Ticket",
      vendor: t?.vendor ?? null,
      amountApproved: t?.totalAmount ?? null,
      amountPaid: t?.amountPaid ?? 0,
      projectName: null,
      propertyName: t?.property?.name ?? null,
      requestedByName: a.requestedBy?.name ?? null,
      acceptedByName: a.acceptedBy?.name ?? null,
      rejectedByName: a.rejectedBy?.name ?? null,
      requestedAt: a.requestedAt.toISOString(),
      acceptedAt: a.acceptedAt?.toISOString() ?? null,
      rejectedAt: a.rejectedAt?.toISOString() ?? null,
      rejectionReason: a.rejectionReason,
      rating: a.rating,
      hash: a.verificationHash,
    }
  })

  // KPIs
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const pendientes = rows.filter(r => r.status === "PENDING")
  const aceptadasMes = rows.filter(r => r.status === "ACCEPTED" && r.acceptedAt && new Date(r.acceptedAt) >= monthStart)
  const rechazadasMes = rows.filter(r => r.status === "REJECTED" && r.rejectedAt && new Date(r.rejectedAt) >= monthStart)
  const aceptadasAll = rows.filter(r => r.status === "ACCEPTED" && r.acceptedAt)
  const tiemposHoras = aceptadasAll
    .map(r => (new Date(r.acceptedAt!).getTime() - new Date(r.requestedAt).getTime()) / 36e5)
    .filter(h => h >= 0)
  const tiempoPromedio = tiemposHoras.length > 0
    ? tiemposHoras.reduce((s, x) => s + x, 0) / tiemposHoras.length
    : 0

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Aceptaciones de Servicio"
        description="Aceptación formal antes del pago final. Sin aceptación, no se puede cerrar al 100% un compromiso con proveedor."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-4 text-amber-600" />
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
          <p className="text-2xl font-display tabular-nums">{pendientes.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <p className="text-xs text-muted-foreground">Aceptadas este mes</p>
          </div>
          <p className="text-2xl font-display tabular-nums">{aceptadasMes.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="size-4 text-destructive" />
            <p className="text-xs text-muted-foreground">Rechazadas este mes</p>
          </div>
          <p className="text-2xl font-display tabular-nums">{rechazadasMes.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BadgeCheck className="size-4 text-blue-600" />
            <p className="text-xs text-muted-foreground">Tiempo promedio</p>
          </div>
          <p className="text-2xl font-display tabular-nums">
            {tiempoPromedio > 0 ? `${tiempoPromedio.toFixed(1)}h` : "—"}
          </p>
        </Card>
      </div>

      {!canAcceptServices && !isOwnerOrAdmin && (
        <Card className="p-4 mb-6 bg-amber-50 border-amber-200 text-amber-900 text-sm">
          🔒 No tienes el permiso <strong>Puede aceptar servicios</strong>. Puedes ver el historial pero no resolver aceptaciones pendientes.
        </Card>
      )}

      <AcceptanceTabs rows={rows} canAct={canAcceptServices} />
    </div>
  )
}
