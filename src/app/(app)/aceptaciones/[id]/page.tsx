import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { BackButton } from "@/components/shared/back-button"
import { formatGTQ, formatDate } from "@/lib/format"
import { canUserAcceptThis } from "@/lib/service-acceptance"
import { AcceptForm } from "./_form"
import { Lock, CheckCircle2, XCircle, Clock, Star, Download, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  ACCEPTED: { label: "Aceptada", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rechazada", className: "bg-red-100 text-red-800" },
  SUPERSEDED: { label: "Reemplazada", className: "bg-gray-100 text-gray-600" },
}

export default async function AcceptanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/login")
  const orgId = (session.user as any).organizationId as string
  const userId = session.user!.id!
  const { id } = await params

  const acceptance = await prisma.serviceAcceptance.findFirst({
    where: { id, organizationId: orgId },
    include: {
      requestedBy: { select: { id: true, name: true } },
      acceptedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
      photos: true,
    },
  })
  if (!acceptance) notFound()

  // Hydrate entity
  let entityName = "Servicio"
  let vendorName: string | null = null
  let vendorPhone: string | null = null
  let projectId: string | null = acceptance.projectId
  let projectName: string | null = null
  let propertyName: string | null = null
  let amountApproved: number | null = null
  let amountPaid = 0
  let entityHref: string | null = null

  if (acceptance.entityType === "PARTIDA") {
    const p = await prisma.projectPartida.findUnique({
      where: { id: acceptance.entityId },
      include: { project: { include: { property: true } }, vendor: true },
    })
    if (p) {
      entityName = p.name
      vendorName = p.vendor?.name ?? null
      vendorPhone = p.vendor?.phone ?? null
      projectName = p.project?.name ?? null
      propertyName = p.project?.property?.name ?? null
      amountApproved = p.amountApproved
      amountPaid = p.amountPaid
      projectId = p.projectId
      entityHref = `/proyectos/${p.projectId}`
    }
  } else {
    const t = await prisma.maintenanceRequest.findUnique({
      where: { id: acceptance.entityId },
      include: { property: true, vendor: true },
    })
    if (t) {
      entityName = `${t.ticketNumber} — ${t.title}`
      vendorName = t.vendor?.name ?? null
      vendorPhone = t.vendor?.phone ?? null
      propertyName = t.property?.name ?? null
      amountApproved = t.totalAmount
      amountPaid = t.amountPaid
      entityHref = `/mantenimiento/${t.id}`
    }
  }

  const statusCfg = STATUS_STYLE[acceptance.status] ?? STATUS_STYLE.PENDING
  const checklist: { key: string; checked: boolean }[] = acceptance.checklist
    ? (() => { try { return JSON.parse(acceptance.checklist!) } catch { return [] } })()
    : []

  const permission = await canUserAcceptThis(orgId, id, userId)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <BackButton href="/aceptaciones" label="Aceptaciones" />
      <Breadcrumb items={[{ label: "Aceptaciones", href: "/aceptaciones" }, { label: entityName.slice(0, 40) }]} />

      <PageHeader
        title={entityName}
        description={`Aceptación de servicio · ${vendorName ?? "Sin proveedor"}`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCfg.className}`}>{statusCfg.label}</span>
          {acceptance.status === "ACCEPTED" && (
            <Link href={`/api/aceptaciones/${id}/pdf`} target="_blank">
              <button className="inline-flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
                <Download className="size-3.5" />Acta PDF
              </button>
            </Link>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Info card */}
          <Card className="p-6 space-y-3">
            <h3 className="font-medium text-sm">Información del servicio</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Proveedor</p>
                <p className="font-medium">{vendorName ?? "—"}</p>
                {vendorPhone && <p className="text-xs text-muted-foreground">{vendorPhone}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{acceptance.entityType === "PARTIDA" ? "Proyecto" : "Propiedad"}</p>
                <p className="font-medium">{projectName ?? propertyName ?? "—"}</p>
                {projectName && propertyName && <p className="text-xs text-muted-foreground">{propertyName}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto comprometido</p>
                <p className="font-medium tabular-nums">{amountApproved != null ? formatGTQ(amountApproved) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagado actualmente</p>
                <p className="font-medium tabular-nums text-emerald-600">{formatGTQ(amountPaid)}</p>
              </div>
            </div>
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Solicitada por <span className="font-medium text-foreground">{acceptance.requestedBy.name}</span>
              {" · "}{formatDate(acceptance.requestedAt)}
              {entityHref && (
                <Link href={entityHref} className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-0.5">
                  ver origen <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
          </Card>

          {/* Pending — show form (if permitted) */}
          {acceptance.status === "PENDING" && permission.ok && (
            <AcceptForm acceptanceId={id} />
          )}

          {/* Pending — locked */}
          {acceptance.status === "PENDING" && !permission.ok && (
            <Card className="p-6 bg-amber-50 border-amber-200 text-sm space-y-2">
              <p className="font-medium flex items-center gap-2 text-amber-900">
                <Lock className="size-4" /> Sin permiso para resolver esta aceptación
              </p>
              <p className="text-amber-800">{permission.reason}</p>
            </Card>
          )}

          {/* Accepted — show acta */}
          {acceptance.status === "ACCEPTED" && (
            <Card className="p-6 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-4" /> Servicio aceptado
              </h3>
              <div className="text-sm">
                Aceptado por <span className="font-medium">{acceptance.acceptedBy?.name}</span>
                {" · "}{acceptance.acceptedAt && formatDate(acceptance.acceptedAt)}
              </div>
              {acceptance.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-2">Calificación:</span>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`size-4 ${n <= (acceptance.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                  ))}
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Checklist verificado</p>
                <ul className="text-sm space-y-1">
                  {checklist.map(c => (
                    <li key={c.key} className="flex items-center gap-2">
                      {c.checked ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <XCircle className="size-3.5 text-muted-foreground" />}
                      <span>{c.key.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {acceptance.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{acceptance.notes}</p>
                </div>
              )}
              {acceptance.photos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Evidencia ({acceptance.photos.length} {acceptance.photos.length === 1 ? "foto" : "fotos"})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {acceptance.photos.map(ph => (
                      <div key={ph.id} className="aspect-square bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground border">
                        {ph.caption ?? ph.url.split("/").pop()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {acceptance.verificationHash && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Hash de verificación: <span className="font-mono break-all">{acceptance.verificationHash}</span>
                </div>
              )}
            </Card>
          )}

          {/* Rejected */}
          {acceptance.status === "REJECTED" && (
            <Card className="p-6 space-y-2 bg-red-50 border-red-200">
              <h3 className="font-medium text-sm flex items-center gap-2 text-red-700">
                <XCircle className="size-4" /> Aceptación rechazada
              </h3>
              <p className="text-sm">
                Rechazada por <span className="font-medium">{acceptance.rejectedBy?.name}</span>
                {" · "}{acceptance.rejectedAt && formatDate(acceptance.rejectedAt)}
              </p>
              {acceptance.rejectionReason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Razón</p>
                  <p className="text-sm italic">«{acceptance.rejectionReason}»</p>
                </div>
              )}
              {acceptance.requiredCorrections && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Correcciones requeridas</p>
                  <p className="text-sm">{acceptance.requiredCorrections}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4 space-y-2 text-sm">
            <h3 className="font-medium">Política de aceptación</h3>
            <p className="text-xs text-muted-foreground">
              Antes del pago final que cierre al 100% un compromiso, debe existir Aceptación de Servicio aprobada
              por un usuario con permiso <strong>canAcceptServices</strong>, distinto al solicitante y a quien aprobó la cotización.
            </p>
            <p className="text-xs text-muted-foreground">
              Caja chica está exceptuada.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
