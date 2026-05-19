"use client"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatGTQ, formatDate } from "@/lib/format"
import { approveRequest, rejectRequest, cosignRequest } from "../actions"
import type { EnrichedItem, EntityData } from "../_types"
import {
  FileText, Layers, FileSignature, Receipt, ReceiptText,
  Briefcase, Wallet, Wrench, Building2, FolderKanban,
  User, Phone, Calendar, Mail, Tag, CheckCircle2,
  XCircle, PenLine, Check, X, AlertTriangle, Hash,
  Clock, CreditCard, ArrowRight, ExternalLink,
} from "lucide-react"

function entityDetailUrl(entity: EntityData, entityId: string): string | null {
  if (!entity || entity.type === "UNKNOWN") return null
  switch (entity.type) {
    case "TICKET":           return `/mantenimiento/${entityId}`
    case "PARTIDA":          return `/proyectos/${entity.projectId}`
    case "QUOTE":            return entity.projectId ? `/proyectos/${entity.projectId}` : null
    case "CONTRACT":         return `/contratos/${entityId}`
    case "VENDOR_INVOICE":   return entity.projectId ? `/proyectos/${entity.projectId}` : `/proveedores/${entity.vendorId}`
    case "INVOICE_MODIFIED": return `/cobros`
    case "VENDOR":           return `/proveedores/${entity.vendorId}`
    case "PETTY_CASH":       return `/caja-chica/${entity.propertyId}`
    default:                 return null
  }
}

const ENTITY_DETAIL_LABEL: Record<string, string> = {
  TICKET:           "Ver ticket",
  PARTIDA:          "Ver proyecto",
  QUOTE:            "Ver proyecto",
  CONTRACT:         "Ver contrato",
  VENDOR_INVOICE:   "Ver factura",
  INVOICE_MODIFIED: "Ver factura",
  VENDOR:           "Ver proveedor",
  PETTY_CASH:       "Ver caja chica",
}

// ── Labels ──────────────────────────────────────────────────────────────

const ENTITY_META: Record<string, { label: string; icon: React.ElementType; bg: string; fg: string }> = {
  QUOTE:            { label: "Cotización",          icon: FileText,       bg: "bg-blue-50",    fg: "text-blue-600"   },
  PARTIDA:          { label: "Partida",              icon: Layers,         bg: "bg-indigo-50",  fg: "text-indigo-600" },
  PROJECT_PARTIDA:  { label: "Cotización partida",   icon: Layers,         bg: "bg-indigo-50",  fg: "text-indigo-600" },
  CONTRACT:         { label: "Contrato",             icon: FileSignature,  bg: "bg-emerald-50", fg: "text-emerald-700"},
  VENDOR_INVOICE:   { label: "Factura proveedor",    icon: Receipt,        bg: "bg-orange-50",  fg: "text-orange-600" },
  INVOICE_MODIFIED: { label: "Factura modificada",   icon: ReceiptText,    bg: "bg-amber-50",   fg: "text-amber-600"  },
  VENDOR:           { label: "Proveedor",            icon: Briefcase,      bg: "bg-teal-50",    fg: "text-teal-600"   },
  PETTY_CASH:       { label: "Caja Chica",           icon: Wallet,         bg: "bg-green-50",   fg: "text-green-600"  },
  TICKET:           { label: "Mantenimiento",        icon: Wrench,         bg: "bg-pink-50",    fg: "text-pink-600"   },
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:        "bg-blue-100 text-blue-800",
  PENDING_COSIGN: "bg-amber-100 text-amber-800",
  APPROVED:       "bg-emerald-100 text-emerald-800",
  REJECTED:       "bg-red-100 text-red-800",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING:        "Pendiente",
  PENDING_COSIGN: "Pendiente co-firma",
  APPROVED:       "Aprobado",
  REJECTED:       "Rechazado",
}

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CAJA_CHICA:            "Caja Chica",
  PROVEEDOR:             "Proveedor (cotización)",
  EFECTIVO_RESPONSABLE:  "Efectivo responsable",
  REEMBOLSO:             "Reembolso",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    "text-muted-foreground",
  MEDIUM: "text-amber-600",
  HIGH:   "text-orange-600",
  URGENT: "text-destructive font-semibold",
}

const CATEGORIES: Record<string, string> = {
  PLUMBING: "Plomeria", ELECTRICAL: "Electricidad", HVAC: "A/C",
  STRUCTURAL: "Estructura", PAINTING: "Pintura", APPLIANCE: "Electrodomesticos",
  SECURITY: "Seguridad", CLEANING: "Limpieza", LANDSCAPING: "Jardineria", OTHER: "Otro",
}

// ── Context links helper ─────────────────────────────────────────────────

type ContextLinkDef = {
  icon: React.ElementType
  label: string
  value: string
  href: string | null
  highlight?: boolean
}

function buildContextLinks(entity: EntityData, entityId: string): ContextLinkDef[] {
  if (!entity || entity.type === "UNKNOWN") return []

  switch (entity.type) {
    case "QUOTE":
      return [
        entity.propertyName && { icon: Building2, label: "Propiedad", value: entity.propertyName, href: entity.propertyId ? `/propiedades/${entity.propertyId}` : null },
        entity.projectName && { icon: FolderKanban, label: "Proyecto", value: entity.projectName, href: entity.projectId ? `/proyectos/${entity.projectId}` : null },
        entity.partidaName && { icon: Layers, label: "Partida", value: entity.partidaName, href: null },
        { icon: Briefcase, label: "Proveedor", value: entity.vendorName, href: `/proveedores/${entity.vendorId}` },
        { icon: Phone, label: "Tel. proveedor", value: entity.vendorPhone, href: null },
        entity.validUntil && { icon: Calendar, label: "Válida hasta", value: formatDate(entity.validUntil), href: null },
        { icon: Hash, label: "Número", value: entity.quoteNumber, href: null },
      ].filter(Boolean) as ContextLinkDef[]

    case "PARTIDA":
      return [
        { icon: FolderKanban, label: "Proyecto", value: entity.projectName, href: `/proyectos/${entity.projectId}` },
        entity.propertyName && { icon: Building2, label: "Propiedad", value: entity.propertyName, href: entity.propertyId ? `/propiedades/${entity.propertyId}` : null },
        entity.vendorName && { icon: Briefcase, label: "Proveedor", value: entity.vendorName, href: entity.vendorId ? `/proveedores/${entity.vendorId}` : null },
        entity.vendorPhone && { icon: Phone, label: "Tel. proveedor", value: entity.vendorPhone, href: null },
        entity.budgetEstimate != null && { icon: CreditCard, label: "Presupuesto estimado", value: formatGTQ(entity.budgetEstimate), href: null },
        entity.approvedQuoteNumber && { icon: FileText, label: "Cotización aprobada", value: entity.approvedQuoteNumber, href: null },
      ].filter(Boolean) as ContextLinkDef[]

    case "CONTRACT":
      return [
        { icon: Building2, label: "Propiedad", value: `${entity.propertyName} · ${entity.propertyCity}`, href: `/propiedades/${entity.propertyId}` },
        { icon: User, label: "Inquilino", value: entity.tenantName, href: `/inquilinos/${entity.tenantId}` },
        { icon: Phone, label: "Tel. inquilino", value: entity.tenantPhone, href: null },
        entity.tenantEmail && { icon: Mail, label: "Email", value: entity.tenantEmail, href: null },
        { icon: Calendar, label: "Vigencia", value: `${formatDate(entity.startDate)} – ${formatDate(entity.endDate)}`, href: null },
        { icon: CreditCard, label: "Renta mensual", value: formatGTQ(entity.monthlyRent), href: null },
        entity.deposit != null && { icon: Wallet, label: "Depósito", value: formatGTQ(entity.deposit), href: null },
      ].filter(Boolean) as ContextLinkDef[]

    case "VENDOR_INVOICE":
      return [
        { icon: Briefcase, label: "Proveedor", value: entity.vendorName, href: `/proveedores/${entity.vendorId}` },
        { icon: Phone, label: "Tel. proveedor", value: entity.vendorPhone, href: null },
        { icon: Hash, label: "Factura", value: entity.invoiceNumber, href: null },
        entity.propertyName && { icon: Building2, label: "Propiedad", value: entity.propertyName, href: entity.propertyId ? `/propiedades/${entity.propertyId}` : null },
        entity.projectName && { icon: FolderKanban, label: "Proyecto", value: entity.projectName, href: entity.projectId ? `/proyectos/${entity.projectId}` : null },
        entity.partidaName && { icon: Layers, label: "Partida", value: entity.partidaName, href: null },
        entity.dueDate && { icon: Calendar, label: "Vencimiento", value: formatDate(entity.dueDate), href: null },
        { icon: CreditCard, label: "Saldo pendiente", value: formatGTQ(entity.balance), href: null, highlight: entity.balance > 0 },
      ].filter(Boolean) as ContextLinkDef[]

    case "INVOICE_MODIFIED":
      return [
        entity.propertyName && { icon: Building2, label: "Propiedad", value: entity.propertyName, href: entity.propertyId ? `/propiedades/${entity.propertyId}` : null },
        entity.tenantName && { icon: User, label: "Inquilino", value: entity.tenantName, href: entity.tenantId ? `/inquilinos/${entity.tenantId}` : null },
        entity.tenantPhone && { icon: Phone, label: "Tel. inquilino", value: entity.tenantPhone, href: null },
        { icon: Hash, label: "Factura", value: entity.invoiceNumber, href: null },
        entity.dueDate && { icon: Calendar, label: "Vencimiento", value: formatDate(entity.dueDate), href: null },
        entity.modificationType && { icon: Tag, label: "Tipo modificación", value: entity.modificationType, href: null },
        entity.modificationAmount != null && { icon: CreditCard, label: "Monto modificación", value: formatGTQ(entity.modificationAmount), href: null, highlight: true },
        entity.modificationReason && { icon: FileText, label: "Razón", value: entity.modificationReason, href: null },
      ].filter(Boolean) as ContextLinkDef[]

    case "VENDOR":
      return [
        { icon: Tag, label: "Categoría", value: entity.category, href: null },
        entity.contactName && { icon: User, label: "Contacto", value: entity.contactName, href: null },
        { icon: Phone, label: "Teléfono", value: entity.phone, href: null },
        entity.email && { icon: Mail, label: "Email", value: entity.email, href: null },
      ].filter(Boolean) as ContextLinkDef[]

    case "PETTY_CASH":
      return [
        { icon: Building2, label: "Propiedad", value: `${entity.propertyName} · ${entity.propertyCity}`, href: `/caja-chica/${entity.propertyId}` },
        { icon: Wallet, label: "Saldo actual", value: formatGTQ(entity.balance), href: null },
        {
          icon: ArrowRight,
          label: "Saldo después",
          value: formatGTQ(entity.balanceAfter),
          href: null,
          highlight: entity.balanceAfter > entity.maxBalance,
        },
      ] as ContextLinkDef[]

    case "TICKET":
      return [
        { icon: Building2, label: "Propiedad", value: entity.propertyName, href: `/propiedades/${entity.propertyId}` },
        { icon: Hash, label: "Ticket", value: entity.ticketNumber, href: `/mantenimiento/${entityId}` },
        { icon: Tag, label: "Categoría", value: CATEGORIES[entity.category] ?? entity.category, href: null },
        { icon: AlertTriangle, label: "Prioridad", value: entity.priority, href: null },
        entity.paymentMode && { icon: CreditCard, label: "Modo de pago", value: PAYMENT_MODE_LABELS[entity.paymentMode] ?? entity.paymentMode, href: null },
        entity.vendorName && { icon: Briefcase, label: "Proveedor", value: entity.vendorName, href: entity.vendorId ? `/proveedores/${entity.vendorId}` : null },
        entity.vendorPhone && { icon: Phone, label: "Tel. proveedor", value: entity.vendorPhone, href: null },
      ].filter(Boolean) as ContextLinkDef[]
  }
}

// ── Age helpers ──────────────────────────────────────────────────────────

function ageLabel(updatedAt: string) {
  const ms = Date.now() - new Date(updatedAt).getTime()
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `hace ${d}d ${h % 24}h`
  if (h > 0) return `hace ${h}h`
  return `hace ${Math.floor(ms / 60000)}m`
}

function ageClass(updatedAt: string, status: string) {
  if (status !== "PENDING" && status !== "PENDING_COSIGN") return "text-muted-foreground"
  const h = (Date.now() - new Date(updatedAt).getTime()) / 3600000
  if (h > 72) return "text-destructive font-semibold"
  if (h > 24) return "text-amber-600"
  return "text-emerald-600"
}

// ── ContextLink component ────────────────────────────────────────────────

function ContextLink({ icon: Icon, label, value, href, highlight }: ContextLinkDef) {
  const inner = (
    <span className={`font-medium text-xs ${highlight ? "text-amber-700" : ""}`}>{value}</span>
  )
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      {href ? (
        <Link href={href} className="font-medium text-xs hover:underline" onClick={e => e.stopPropagation()}>
          {value}
        </Link>
      ) : inner}
    </div>
  )
}

// ── Main card ────────────────────────────────────────────────────────────

interface Props {
  item: EnrichedItem
  currentUserId: string
  authorityPolicy: string
  role: string
}

export function ApprovalCard({ item, currentUserId, authorityPolicy, role }: Props) {
  const { request: r, entity } = item
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const meta = ENTITY_META[r.entityType] ?? {
    label: r.entityType,
    icon: FileText,
    bg: "bg-muted",
    fg: "text-foreground",
  }
  const EntityIcon = meta.icon

  const isSuperAdmin = role === "ADMIN"
  const isRequester = r.requestedBy.id === currentUserId
  const isCosigner = r.cosigner?.id === currentUserId
  // Super admin bypasses the "no self-approval" rule
  const canApprove = (isSuperAdmin || !isRequester) && authorityPolicy !== "NONE" && r.status === "PENDING"
  const canCosign = r.status === "PENDING_COSIGN" && (isSuperAdmin || !isRequester) &&
    (isCosigner || isSuperAdmin || (!r.cosigner && authorityPolicy === "ALONE"))
  const canReject = (isSuperAdmin || !isRequester) && (r.status === "PENDING" || r.status === "PENDING_COSIGN")
  const isStuck = (r.status === "PENDING" || r.status === "PENDING_COSIGN") &&
    Date.now() - new Date(r.updatedAt).getTime() > 72 * 3600 * 1000
  const isPending = r.status === "PENDING" || r.status === "PENDING_COSIGN"

  const contextLinks = buildContextLinks(entity, r.entityId)

  // Property name to show in header (when applicable)
  const headerPropertyName = entity && entity.type !== "UNKNOWN" && "propertyName" in entity
    ? entity.propertyName as string | undefined
    : undefined

  const detailUrl = entity ? entityDetailUrl(entity, r.entityId) : null
  const detailLabel = ENTITY_DETAIL_LABEL[r.entityType] ?? "Ver detalle"

  // Displayed amount: use request.amount; fall back to entity total
  const displayAmount = r.amount ?? (() => {
    if (!entity || entity.type === "UNKNOWN") return null
    if (entity.type === "QUOTE") return entity.total
    if (entity.type === "VENDOR_INVOICE") return entity.total
    if (entity.type === "INVOICE_MODIFIED") return entity.total
    if (entity.type === "CONTRACT") return entity.monthlyRent
    return null
  })()

  async function handle(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  return (
    <div
      className={`rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20 ${
        isStuck ? "border-l-4 border-l-destructive" : ""
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
            <EntityIcon className={`size-4 ${meta.fg}`} />
          </div>
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground shrink-0">
            {meta.label}
          </span>
          {headerPropertyName && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-foreground font-medium flex items-center gap-1 min-w-0 max-w-[280px]">
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{headerPropertyName}</span>
            </span>
          )}
          {isRequester && (r.status === "PENDING" || r.status === "PENDING_COSIGN") && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium shrink-0">
              Tú la creaste
            </span>
          )}
          {isStuck && <AlertTriangle className="size-3.5 text-destructive shrink-0" />}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {displayAmount != null && (
            <p className="font-display text-xl tabular-nums leading-none">{formatGTQ(displayAmount)}</p>
          )}
          {detailUrl && (
            <Link
              href={detailUrl}
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-foreground/15 hover:border-foreground/30 hover:bg-muted transition-colors"
            >
              <ExternalLink className="size-3" />{detailLabel}
            </Link>
          )}
        </div>
      </div>

      {/* ── Title ── */}
      {detailUrl ? (
        <Link href={detailUrl} className="block mb-3 hover:underline">
          <p className="font-medium text-sm line-clamp-2">
            {r.title ?? `${meta.label} ${r.entityId.slice(0, 8)}`}
          </p>
        </Link>
      ) : (
        <p className="font-medium text-sm mb-3 line-clamp-2">
          {r.title ?? `${meta.label} ${r.entityId.slice(0, 8)}`}
        </p>
      )}

      {/* ── Context links ── */}
      {contextLinks.length > 0 && (
        <div className="space-y-1.5 mb-4 pl-1">
          {contextLinks.map(link => (
            <ContextLink key={link.label} {...link} />
          ))}
        </div>
      )}

      {entity === null && (
        <p className="text-xs text-amber-600 mb-3 flex items-center gap-1">
          <AlertTriangle className="size-3" /> Entidad original no encontrada (puede haber sido eliminada)
        </p>
      )}

      {/* ── Footer ── */}
      <div className="pt-3 border-t space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? "bg-muted text-foreground"}`}>
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
              <span className="text-xs text-muted-foreground">
                Por {r.requestedBy.name} · {formatDate(r.createdAt)}
              </span>
              <span className={`text-xs ${ageClass(r.updatedAt, r.status)}`}>
                {ageLabel(r.updatedAt)}
              </span>
            </div>

            {r.status === "PENDING_COSIGN" && (
              <p className="text-xs text-muted-foreground">
                1ra firma: <span className="font-medium text-foreground">{r.requestedBy.name}</span>
                {" · "}
                {r.cosigner
                  ? <>Esperando co-firma de: <span className="font-medium text-foreground">{r.cosigner.name}</span></>
                  : <span className="text-amber-700">Requiere co-firma de un autorizador</span>
                }
              </p>
            )}
            {r.status === "APPROVED" && r.approvedBy && (
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Aprobado por {r.approvedBy.name}{r.approvedAt ? ` · ${formatDate(r.approvedAt)}` : ""}
              </p>
            )}
            {r.status === "REJECTED" && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="size-3" />
                {r.rejectedBy ? `Rechazado por ${r.rejectedBy.name}` : "Rechazado"}
                {r.rejectionReason ? ` — ${r.rejectionReason}` : ""}
              </p>
            )}
          </div>

          {/* ── Actions ── */}
          {isPending && !rejectMode && (
            <div className="flex items-center gap-1.5 shrink-0">
              {canApprove && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                  disabled={loading}
                  onClick={() => handle(() => approveRequest(r.id))}
                >
                  <Check className="size-3.5 mr-1" />Aprobar
                </Button>
              )}
              {canCosign && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={loading}
                  onClick={() => handle(() => cosignRequest(r.id))}
                >
                  <PenLine className="size-3.5 mr-1" />Co-firmar
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/5 h-8"
                  disabled={loading}
                  onClick={() => setRejectMode(true)}
                >
                  <X className="size-3.5 mr-1" />Rechazar
                </Button>
              )}
              {isRequester && !canApprove && !canCosign && !canReject && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />Esperando aprobación
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Reject inline form ── */}
        {rejectMode && (
          <div className="flex items-center gap-2 pt-1">
            <input
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              className="text-xs border rounded-md px-2 py-1.5 flex-1 focus:outline-none focus:ring-1 focus:ring-ring bg-background"
            />
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              disabled={!reason.trim() || loading}
              onClick={() => handle(() => rejectRequest(r.id, reason))}
            >
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setRejectMode(false); setReason("") }}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
