"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { BackButton } from "@/components/shared/back-button"
import { Breadcrumb } from "@/components/shared/breadcrumb"
import { buildCsv, csvDataUrl } from "@/lib/csv-export"
import { markOrphanRejected, forceApprove } from "./actions"
import {
  AlertTriangle, CheckCircle2, Clock, XCircle, Users,
  RefreshCw, Download, ExternalLink, User, ShieldAlert,
  ShieldCheck, ShieldOff, Activity,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────
type RequestRow = {
  id: string
  entityType: string
  entityId: string
  relatedId: string | null
  title: string | null
  amount: number | null
  status: string
  notes: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  cosignedAt: string | null
  requestedBy: { id: string; name: string; role: string }
  cosigner: { id: string; name: string } | null
  approvedBy: { id: string; name: string } | null
  rejectedBy: { id: string; name: string } | null
}

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  authorityPolicy: string
  isActive: boolean
  cosignPolicy: { id: string; allowedCosigners: { id: string; name: string }[] } | null
  cosignAllowedIn: { user: { id: string; name: string } }[]
}

type EntityTypeStat = {
  type: string
  total: number
  pending: number
  approved: number
  rejected: number
  avgApprovalMs: number | null
}

type Stats = {
  total: number
  byStatus: Record<string, number>
  avgApprovalMs: number | null
  stuckCount: number
  byEntityType: EntityTypeStat[]
}

type Diagnostics = {
  stuckIds: string[]
  usersNoCosigners: UserRow[]
  usersMissingPolicy: UserRow[]
  orphanPettyCash: RequestRow[]
  pettyCashesNoApproval: { id: string; propertyId: string; propertyName: string; replenishmentCount: number }[]
}

// ── Constants ──────────────────────────────────────────────────────────
const ENTITY_LABELS: Record<string, string> = {
  QUOTE: "Cotización",
  CONTRACT: "Contrato",
  VENDOR_INVOICE: "Factura proveedor",
  INVOICE_MODIFIED: "Factura modificada",
  VENDOR: "Proveedor",
  PARTIDA: "Partida",
  PROJECT_PARTIDA: "Cotización partida",
  PETTY_CASH: "Caja Chica",
  TICKET: "Ticket",
}

const ENTITY_COLORS: Record<string, string> = {
  QUOTE: "bg-purple-100 text-purple-800",
  CONTRACT: "bg-blue-100 text-blue-800",
  VENDOR_INVOICE: "bg-orange-100 text-orange-800",
  INVOICE_MODIFIED: "bg-yellow-100 text-yellow-800",
  VENDOR: "bg-teal-100 text-teal-800",
  PARTIDA: "bg-indigo-100 text-indigo-800",
  PROJECT_PARTIDA: "bg-violet-100 text-violet-800",
  PETTY_CASH: "bg-emerald-100 text-emerald-800",
  TICKET: "bg-pink-100 text-pink-800",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PENDING_COSIGN: "Pendiente co-firma",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-800",
  PENDING_COSIGN: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
}

const POLICY_LABELS: Record<string, string> = {
  NONE: "Sin autoridad",
  ALONE: "Actúa solo",
  COSIGN_REQUIRED: "Requiere co-firma",
}

const POLICY_COLORS: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-600",
  ALONE: "bg-emerald-100 text-emerald-700",
  COSIGN_REQUIRED: "bg-amber-100 text-amber-700",
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  SUPERVISOR: "Supervisor",
  ASSISTANT: "Asistente",
  VIEWER: "Visualizador",
}

// ── Helpers ────────────────────────────────────────────────────────────
function fmtGTQ(n: number | null | undefined) {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", minimumFractionDigits: 2 }).format(n)
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
}

function fmtRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `hace ${d}d ${h % 24}h`
  if (h > 0) return `hace ${h}h`
  const m = Math.floor(ms / 60000)
  return `hace ${m}m`
}

function ageColor(updatedAt: string, status: string) {
  if (status === "APPROVED" || status === "REJECTED") return "text-muted-foreground"
  const h = (Date.now() - new Date(updatedAt).getTime()) / 3600000
  if (h > 72) return "text-red-600 font-semibold"
  if (h > 24) return "text-amber-600"
  return "text-emerald-600"
}

function fmtDuration(ms: number | null) {
  if (ms == null) return "—"
  const h = Math.round(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  return `${h}h`
}

function entityUrl(entityType: string, entityId: string, relatedId: string | null): string | null {
  switch (entityType) {
    case "CONTRACT": return `/contratos/${entityId}`
    case "VENDOR": return `/proveedores/${entityId}`
    case "PETTY_CASH": return relatedId ? `/caja-chica/${relatedId}` : `/caja-chica`
    case "TICKET": return `/mantenimiento/${entityId}`
    case "QUOTE": return `/cotizaciones`
    case "PARTIDA": return relatedId ? `/proyectos/${relatedId}` : `/proyectos`
    case "PROJECT_PARTIDA": return relatedId ? `/proyectos/${relatedId}` : `/proyectos`
    case "VENDOR_INVOICE": return `/pagos`
    default: return null
  }
}

// ── Main component ─────────────────────────────────────────────────────
interface Props {
  requests: RequestRow[]
  users: UserRow[]
  stats: Stats
  diagnostics: Diagnostics
}

export function AuditClient({ requests, users, stats, diagnostics }: Props) {
  // Tab 2 filters
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string[]>([])
  const [filterUser, setFilterUser] = useState("")
  const [filterStuckOnly, setFilterStuckOnly] = useState(false)
  const stuckSet = useMemo(() => new Set(diagnostics.stuckIds), [diagnostics.stuckIds])

  // Tab 4 selected user
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "")

  // Tab 5 selected request
  const [selectedReqId, setSelectedReqId] = useState(requests[0]?.id ?? "")

  // ── Filtered requests (Tab 2) ──
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus.length > 0 && !filterStatus.includes(r.status)) return false
      if (filterType.length > 0 && !filterType.includes(r.entityType)) return false
      if (filterUser && r.requestedBy.id !== filterUser) return false
      if (filterStuckOnly && !stuckSet.has(r.id)) return false
      return true
    })
  }, [requests, filterStatus, filterType, filterUser, filterStuckOnly, stuckSet])

  // ── CSV export ──
  function downloadCsv() {
    const rows = [
      ["ID", "Tipo", "Título", "Monto", "Estado", "Solicitado por", "Fecha creación", "Aprobado por", "Fecha aprobación", "Rechazado por", "Razón rechazo"],
      ...requests.map(r => [
        r.id.slice(0, 8),
        ENTITY_LABELS[r.entityType] ?? r.entityType,
        r.title ?? "",
        r.amount ?? "",
        STATUS_LABELS[r.status] ?? r.status,
        r.requestedBy.name,
        fmtDate(r.createdAt),
        r.approvedBy?.name ?? "",
        fmtDate(r.approvedAt),
        r.rejectedBy?.name ?? "",
        r.rejectionReason ?? "",
      ]),
    ]
    const url = csvDataUrl(buildCsv(rows))
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-autorizaciones-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  // ── Selected user (Tab 4) ──
  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId])
  const userRequests = useMemo(() => ({
    made: requests.filter(r => r.requestedBy.id === selectedUserId),
    approved: requests.filter(r => r.approvedBy?.id === selectedUserId),
    rejected: requests.filter(r => r.rejectedBy?.id === selectedUserId),
    pending: requests.filter(r => r.requestedBy.id === selectedUserId && (r.status === "PENDING" || r.status === "PENDING_COSIGN")),
  }), [requests, selectedUserId])

  // ── Selected request (Tab 5) ──
  const selectedReq = useMemo(() => requests.find(r => r.id === selectedReqId), [requests, selectedReqId])

  // ── Total diagnostic issues count ──
  const issueCount =
    diagnostics.stuckIds.length +
    diagnostics.usersNoCosigners.length +
    diagnostics.usersMissingPolicy.length +
    diagnostics.orphanPettyCash.length +
    diagnostics.pettyCashesNoApproval.length

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <BackButton href="/reportes" label="Reportes" />
      <Breadcrumb items={[
        { label: "Reportes", href: "/reportes" },
        { label: "Auditoría de Autorizaciones" },
      ]} />

      <PageHeader
        title="Auditoría de Autorizaciones"
        description="Diagnóstico del sistema de aprobaciones por co-firma"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4 mr-1.5" />
            Refrescar
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="size-4 mr-1.5" />
            Exportar CSV
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="resumen">
        <TabsList className="mb-6">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="flujo">Flujo detallado</TabsTrigger>
          <TabsTrigger value="alertas">
            Inconsistencias
            {issueCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{issueCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="usuario">Por usuario</TabsTrigger>
          <TabsTrigger value="visual">Visualizar flujo</TabsTrigger>
        </TabsList>

        {/* ═══ TAB 1: RESUMEN ═══ */}
        <TabsContent value="resumen" className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard label="Total" value={stats.total} icon={<Activity className="size-4" />} />
            <KpiCard
              label="Pendientes"
              value={(stats.byStatus["PENDING"] ?? 0) + (stats.byStatus["PENDING_COSIGN"] ?? 0)}
              icon={<Clock className="size-4" />}
              color="amber"
            />
            <KpiCard label="Aprobadas" value={stats.byStatus["APPROVED"] ?? 0} icon={<CheckCircle2 className="size-4" />} color="emerald" />
            <KpiCard label="Rechazadas" value={stats.byStatus["REJECTED"] ?? 0} icon={<XCircle className="size-4" />} color="red" />
            <KpiCard label="Pendiente" value={stats.byStatus["PENDING"] ?? 0} icon={<Clock className="size-4" />} />
            <KpiCard label="Co-firma pend." value={stats.byStatus["PENDING_COSIGN"] ?? 0} icon={<Users className="size-4" />} color="amber" />
            <KpiCard
              label="Colgadas >72h"
              value={stats.stuckCount}
              icon={<AlertTriangle className="size-4" />}
              color={stats.stuckCount > 0 ? "red" : "emerald"}
            />
          </div>

          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Tiempo promedio de aprobación</p>
            <p className="font-display text-2xl">{fmtDuration(stats.avgApprovalMs)}</p>
          </Card>

          {/* By entity type table */}
          <Card className="p-6">
            <h3 className="font-medium text-sm mb-4">Por tipo de entidad</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-right py-2 px-3">Total</th>
                    <th className="text-right py-2 px-3">Pendientes</th>
                    <th className="text-right py-2 px-3">Aprobadas</th>
                    <th className="text-right py-2 px-3">Rechazadas</th>
                    <th className="text-right py-2 px-3">% Aprobación</th>
                    <th className="text-right py-2 px-3">T° promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byEntityType.sort((a, b) => b.total - a.total).map(et => {
                    const resolved = et.approved + et.rejected
                    const pct = resolved > 0 ? Math.round((et.approved / resolved) * 100) : null
                    return (
                      <tr key={et.type} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTITY_COLORS[et.type] ?? "bg-gray-100 text-gray-700"}`}>
                            {ENTITY_LABELS[et.type] ?? et.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{et.total}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {et.pending > 0 ? <span className="text-amber-600 font-medium">{et.pending}</span> : et.pending}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-emerald-600">{et.approved}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-red-600">{et.rejected}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {pct != null ? `${pct}%` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{fmtDuration(et.avgApprovalMs)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ═══ TAB 2: FLUJO DETALLADO ═══ */}
        <TabsContent value="flujo" className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estado</p>
                <div className="flex gap-1 flex-wrap">
                  {["PENDING", "PENDING_COSIGN", "APPROVED", "REJECTED"].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(prev =>
                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                      )}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        filterStatus.includes(s)
                          ? STATUS_COLORS[s]
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                <div className="flex gap-1 flex-wrap">
                  {Array.from(new Set(requests.map(r => r.entityType))).map(et => (
                    <button
                      key={et}
                      onClick={() => setFilterType(prev =>
                        prev.includes(et) ? prev.filter(x => x !== et) : [...prev, et]
                      )}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        filterType.includes(et)
                          ? ENTITY_COLORS[et] ?? "bg-gray-100 text-gray-700"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {ENTITY_LABELS[et] ?? et}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Solicitado por</p>
                <select
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1 bg-background"
                >
                  <option value="">Todos</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterStuckOnly}
                  onChange={e => setFilterStuckOnly(e.target.checked)}
                  className="rounded"
                />
                Solo colgadas &gt;72h
              </label>
              {(filterStatus.length > 0 || filterType.length > 0 || filterUser || filterStuckOnly) && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setFilterStatus([]); setFilterType([]); setFilterUser(""); setFilterStuckOnly(false)
                }}>
                  Limpiar filtros
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Mostrando {filteredRequests.length} de {requests.length} solicitudes
            </p>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-3 px-4">ID</th>
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Título</th>
                    <th className="text-right py-3 px-4">Monto</th>
                    <th className="text-left py-3 px-4">Estado</th>
                    <th className="text-left py-3 px-4">Flujo de firmas</th>
                    <th className="text-left py-3 px-4">Tiempo en estado</th>
                    <th className="text-left py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-muted-foreground">
                        Sin resultados con los filtros actuales
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map(r => {
                      const url = entityUrl(r.entityType, r.entityId, r.relatedId)
                      const isStuck = stuckSet.has(r.id)
                      return (
                        <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 ${isStuck ? "bg-red-50/40" : ""}`}>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</span>
                            {isStuck && <AlertTriangle className="inline size-3 text-red-500 ml-1" />}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ENTITY_COLORS[r.entityType] ?? "bg-gray-100 text-gray-700"}`}>
                              {ENTITY_LABELS[r.entityType] ?? r.entityType}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-[220px]">
                            <p className="truncate text-sm">{r.title ?? `${r.entityType}:${r.entityId.slice(0, 6)}`}</p>
                            <p className="text-xs text-muted-foreground">{r.requestedBy.name} · {fmtRelative(r.createdAt)}</p>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-sm">{fmtGTQ(r.amount)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? ""}`}>
                              {STATUS_LABELS[r.status] ?? r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 min-w-[220px]">
                            <SignatureFlowCell r={r} />
                          </td>
                          <td className={`py-3 px-4 text-sm ${ageColor(r.updatedAt, r.status)}`}>
                            {fmtRelative(r.updatedAt)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setSelectedReqId(r.id) }}
                                className="text-xs text-blue-600 hover:underline"
                                title="Ver flujo completo"
                              >
                                Flujo
                              </button>
                              {url && (
                                <Link href={url} className="text-xs text-muted-foreground hover:underline flex items-center gap-0.5">
                                  <ExternalLink className="size-3" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ═══ TAB 3: INCONSISTENCIAS ═══ */}
        <TabsContent value="alertas" className="space-y-5">

          {/* 3.1 — Caja chica sin approval */}
          <DiagSection
            title="Cajas chica con reposiciones sin solicitud de aprobación"
            count={diagnostics.pettyCashesNoApproval.length}
            description="Estas cajas tienen movimientos de tipo REPLENISHMENT pero no tienen ningún ApprovalRequest asociado. Posiblemente fueron repuestas con autoridad ALONE sin registrar."
          >
            {diagnostics.pettyCashesNoApproval.length === 0 ? (
              <OkRow label="Todas las reposiciones tienen ApprovalRequest" />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-3">Propiedad</th>
                  <th className="text-right py-2 px-3">Reposiciones</th>
                  <th className="py-2 px-3"></th>
                </tr></thead>
                <tbody>
                  {diagnostics.pettyCashesNoApproval.map(pc => (
                    <tr key={pc.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{pc.propertyName}</td>
                      <td className="py-2 px-3 text-right">{pc.replenishmentCount}</td>
                      <td className="py-2 px-3">
                        <Link href={`/caja-chica/${pc.propertyId}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="size-3" /> Ver caja
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DiagSection>

          {/* 3.2 — Orphan requests */}
          <DiagSection
            title="ApprovalRequests huérfanas (entidad eliminada)"
            count={diagnostics.orphanPettyCash.length}
            description="ApprovalRequests de tipo PETTY_CASH cuyo entityId no coincide con ningún PettyCash existente. La entidad fue probablemente eliminada."
          >
            {diagnostics.orphanPettyCash.length === 0 ? (
              <OkRow label="No se detectaron requests huérfanas en Caja Chica" />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-3">ID</th>
                  <th className="text-left py-2 px-3">Título</th>
                  <th className="text-left py-2 px-3">Estado</th>
                  <th className="text-left py-2 px-3">Fecha</th>
                  <th className="py-2 px-3"></th>
                </tr></thead>
                <tbody>
                  {diagnostics.orphanPettyCash.map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 px-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                      <td className="py-2 px-3">{r.title ?? "—"}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ""}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                      <td className="py-2 px-3">
                        <OrphanActions id={r.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DiagSection>

          {/* 3.3 — Stuck requests */}
          <DiagSection
            title="Solicitudes atoradas (+72h sin acción)"
            count={diagnostics.stuckIds.length}
            description="Solicitudes en estado PENDING o PENDING_COSIGN que no han tenido ningún cambio en más de 72 horas."
          >
            {diagnostics.stuckIds.length === 0 ? (
              <OkRow label="No hay solicitudes atoradas" />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-3">ID</th>
                  <th className="text-left py-2 px-3">Tipo</th>
                  <th className="text-left py-2 px-3">Título</th>
                  <th className="text-left py-2 px-3">Estado</th>
                  <th className="text-left py-2 px-3">Solicitado por</th>
                  <th className="text-left py-2 px-3">Tiempo sin acción</th>
                  <th className="py-2 px-3"></th>
                </tr></thead>
                <tbody>
                  {requests.filter(r => stuckSet.has(r.id)).map(r => (
                    <tr key={r.id} className="border-b last:border-0 bg-red-50/30">
                      <td className="py-2 px-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${ENTITY_COLORS[r.entityType] ?? "bg-gray-100 text-gray-700"}`}>
                          {ENTITY_LABELS[r.entityType] ?? r.entityType}
                        </span>
                      </td>
                      <td className="py-2 px-3">{r.title ?? "—"}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ""}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">{r.requestedBy.name}</td>
                      <td className="py-2 px-3 text-red-600 font-semibold">{fmtRelative(r.updatedAt)}</td>
                      <td className="py-2 px-3">
                        <StuckActions id={r.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DiagSection>

          {/* 3.4 — Users missing policy */}
          <DiagSection
            title="Usuarios sin política de autorización configurada"
            count={diagnostics.usersMissingPolicy.length}
            description="Usuarios donde authorityPolicy es nulo o vacío. Esto es un error de configuración — todos los usuarios deberían tener NONE, ALONE, o COSIGN_REQUIRED."
          >
            {diagnostics.usersMissingPolicy.length === 0 ? (
              <OkRow label="Todos los usuarios tienen política configurada" />
            ) : (
              <UserTable users={diagnostics.usersMissingPolicy} />
            )}
          </DiagSection>

          {/* 3.5 — COSIGN_REQUIRED without cosigners */}
          <DiagSection
            title="Usuarios COSIGN_REQUIRED sin co-firmantes definidos"
            count={diagnostics.usersNoCosigners.length}
            description="Estos usuarios tienen authorityPolicy=COSIGN_REQUIRED pero no tienen co-firmantes configurados en CosignPolicy.allowedCosigners. El flujo de co-firma estará completamente roto para ellos: sus solicitudes nunca podrán ser co-firmadas."
          >
            {diagnostics.usersNoCosigners.length === 0 ? (
              <OkRow label="Todos los COSIGN_REQUIRED tienen co-firmantes definidos" />
            ) : (
              <div className="space-y-2">
                {diagnostics.usersNoCosigners.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-md border border-amber-200">
                    <div>
                      <span className="font-medium text-sm">{u.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                      <span className="text-xs text-muted-foreground ml-2">{ROLE_LABELS[u.role] ?? u.role}</span>
                    </div>
                    <Link href="/configuracion" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="size-3" /> Configurar
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </DiagSection>

          {/* 3.6 — Who can unblock stuck requests */}
          {diagnostics.stuckIds.length > 0 && (
            <DiagSection
              title="Quién puede destrabar las solicitudes atoradas"
              count={0}
              description="Para cada solicitud atorada, usuarios con ALONE policy que podrían aprobarla directamente (si no son el solicitante)."
            >
              {(() => {
                const alonUsers = users.filter(u => u.authorityPolicy === "ALONE" && u.isActive)
                const stuckRequests = requests.filter(r => stuckSet.has(r.id))
                return (
                  <div className="space-y-2">
                    {stuckRequests.map(r => (
                      <div key={r.id} className="text-sm py-2 border-b last:border-0">
                        <p className="font-medium">{r.title ?? r.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground mb-1">
                          Solicitada por: {r.requestedBy.name} · {fmtRelative(r.createdAt)}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {alonUsers.filter(u => u.id !== r.requestedBy.id).map(u => (
                            <span key={u.id} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                              {u.name} (puede aprobar)
                            </span>
                          ))}
                          {alonUsers.filter(u => u.id !== r.requestedBy.id).length === 0 && (
                            <span className="text-xs text-red-600">No hay usuarios con autoridad ALONE disponibles</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </DiagSection>
          )}
        </TabsContent>

        {/* ═══ TAB 4: POR USUARIO ═══ */}
        <TabsContent value="usuario" className="space-y-5">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">Usuario:</p>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="text-sm border rounded-md px-3 py-1.5 bg-background"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({POLICY_LABELS[u.authorityPolicy] ?? u.authorityPolicy})</option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Profile */}
              <div className="space-y-4">
                <Card className="p-5">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <User className="size-4" /> Perfil de autorización
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre</span>
                      <span className="font-medium">{selectedUser.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rol</span>
                      <span>{ROLE_LABELS[selectedUser.role] ?? selectedUser.role}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Política</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POLICY_COLORS[selectedUser.authorityPolicy] ?? "bg-gray-100"}`}>
                        {POLICY_LABELS[selectedUser.authorityPolicy] ?? selectedUser.authorityPolicy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado</span>
                      <span className={selectedUser.isActive ? "text-emerald-600" : "text-red-600"}>
                        {selectedUser.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  {selectedUser.authorityPolicy === "COSIGN_REQUIRED" && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sus co-firmantes:</p>
                      {selectedUser.cosignPolicy?.allowedCosigners.length ? (
                        <div className="space-y-1">
                          {selectedUser.cosignPolicy.allowedCosigners.map(cs => (
                            <div key={cs.id} className="flex items-center gap-2 text-sm">
                              <ShieldCheck className="size-3 text-emerald-600" />
                              <span>{cs.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <ShieldAlert className="size-3" /> Sin co-firmantes — flujo roto
                        </p>
                      )}
                    </div>
                  )}

                  {selectedUser.cosignAllowedIn.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Es co-firmante de:</p>
                      <div className="space-y-1">
                        {selectedUser.cosignAllowedIn.map(cp => (
                          <div key={cp.user.id} className="flex items-center gap-2 text-sm">
                            <Users className="size-3 text-blue-600" />
                            <span>{cp.user.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* KPIs */}
                <Card className="p-5">
                  <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Activity className="size-4" /> Estadísticas
                  </h3>
                  <div className="space-y-2 text-sm">
                    {[
                      ["Solicitudes creadas", userRequests.made.length],
                      ["Aprobadas por él", userRequests.approved.length],
                      ["Rechazadas por él", userRequests.rejected.length],
                      ["Pendientes actuales", userRequests.pending.length],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium tabular-nums">{val}</span>
                      </div>
                    ))}
                    {(() => {
                      const approvedByHim = userRequests.approved.filter(r => r.approvedAt)
                      if (approvedByHim.length === 0) return null
                      const avg = approvedByHim.reduce((s, r) => s + (new Date(r.approvedAt!).getTime() - new Date(r.createdAt).getTime()), 0) / approvedByHim.length
                      return (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">T° promedio aprobación</span>
                          <span className="font-medium">{fmtDuration(avg)}</span>
                        </div>
                      )
                    })()}
                  </div>
                </Card>
              </div>

              {/* Activity */}
              <div className="lg:col-span-2 space-y-4">
                {userRequests.pending.length > 0 && (
                  <Card className="p-5 border-amber-200 bg-amber-50/30">
                    <h3 className="font-medium text-sm mb-3 text-amber-800">
                      Solicitudes pendientes ({userRequests.pending.length})
                    </h3>
                    <RequestMiniList requests={userRequests.pending} />
                  </Card>
                )}

                <Card className="p-5">
                  <h3 className="font-medium text-sm mb-3">Solicitudes creadas ({userRequests.made.length})</h3>
                  {userRequests.made.length === 0
                    ? <p className="text-sm text-muted-foreground">Sin solicitudes creadas</p>
                    : <RequestMiniList requests={userRequests.made} showStatus />
                  }
                </Card>

                <Card className="p-5">
                  <h3 className="font-medium text-sm mb-3">Aprobadas por este usuario ({userRequests.approved.length})</h3>
                  {userRequests.approved.length === 0
                    ? <p className="text-sm text-muted-foreground">Sin aprobaciones</p>
                    : <RequestMiniList requests={userRequests.approved} showStatus approvedCol />
                  }
                </Card>

                {userRequests.rejected.length > 0 && (
                  <Card className="p-5 border-red-200">
                    <h3 className="font-medium text-sm mb-3 text-red-700">Rechazadas por este usuario ({userRequests.rejected.length})</h3>
                    <RequestMiniList requests={userRequests.rejected} showStatus showRejection />
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB 5: VISUALIZAR FLUJO ═══ */}
        <TabsContent value="visual" className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">Solicitud:</p>
            <select
              value={selectedReqId}
              onChange={e => setSelectedReqId(e.target.value)}
              className="text-sm border rounded-md px-3 py-1.5 bg-background max-w-lg"
            >
              {requests.map(r => (
                <option key={r.id} value={r.id}>
                  [{r.id.slice(0, 8)}] {r.title ?? `${r.entityType}:${r.entityId.slice(0, 6)}`} — {STATUS_LABELS[r.status] ?? r.status}
                </option>
              ))}
            </select>
          </div>

          {selectedReq && <FlowDiagram req={selectedReq} stuckSet={stuckSet} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color?: "amber" | "emerald" | "red"
}) {
  const textColor = color === "amber" ? "text-amber-600" : color === "emerald" ? "text-emerald-600" : color === "red" ? "text-red-600" : "text-foreground"
  return (
    <Card className="p-4">
      <div className={`flex items-center gap-1.5 mb-1 text-muted-foreground`}>{icon}<p className="text-xs">{label}</p></div>
      <p className={`font-display text-2xl tabular-nums ${textColor}`}>{value}</p>
    </Card>
  )
}

function DiagSection({
  title, count, description, children,
}: {
  title: string
  count: number
  description: string
  children: React.ReactNode
}) {
  const hasIssues = count > 0
  return (
    <Card className={`p-5 ${hasIssues ? "border-amber-300" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {hasIssues
            ? <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            : <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
          }
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        {hasIssues && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium shrink-0">{count} problema{count !== 1 ? "s" : ""}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-6">{description}</p>
      <div className="ml-6">{children}</div>
    </Card>
  )
}

function OkRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-emerald-700">
      <CheckCircle2 className="size-4" />
      {label}
    </div>
  )
}

function UserTable({ users }: { users: UserRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b text-xs text-muted-foreground uppercase">
        <th className="text-left py-2 px-3">Nombre</th>
        <th className="text-left py-2 px-3">Email</th>
        <th className="text-left py-2 px-3">Rol</th>
        <th className="text-left py-2 px-3">Política actual</th>
      </tr></thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id} className="border-b last:border-0">
            <td className="py-2 px-3">{u.name}</td>
            <td className="py-2 px-3 text-muted-foreground">{u.email}</td>
            <td className="py-2 px-3">{ROLE_LABELS[u.role] ?? u.role}</td>
            <td className="py-2 px-3">
              <span className="text-xs text-red-600 font-mono">
                {u.authorityPolicy || "(vacío)"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SignatureFlowCell({ r }: { r: RequestRow }) {
  if (r.status === "PENDING") {
    return <p className="text-xs text-muted-foreground">Esperando cualquier autorizador</p>
  }
  if (r.status === "PENDING_COSIGN") {
    return (
      <div className="text-xs space-y-0.5">
        <p>1ra firma: <span className="font-medium">{r.requestedBy.name}</span></p>
        <p className="text-amber-600">Esperando co-firma</p>
        {r.cosigner && <p className="text-muted-foreground">Asignado a: {r.cosigner.name}</p>}
      </div>
    )
  }
  if (r.status === "APPROVED") {
    return (
      <div className="text-xs space-y-0.5">
        {r.cosignedAt && r.cosigner && (
          <p className="text-emerald-700">Co-firmado: <span className="font-medium">{r.cosigner.name}</span> · {fmtDate(r.cosignedAt)}</p>
        )}
        <p className="text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          {r.approvedBy ? `${r.approvedBy.name} · ${fmtDate(r.approvedAt)}` : fmtDate(r.approvedAt)}
        </p>
      </div>
    )
  }
  if (r.status === "REJECTED") {
    return (
      <div className="text-xs space-y-0.5">
        <p className="text-red-600 flex items-center gap-1">
          <XCircle className="size-3" />
          {r.rejectedBy ? `${r.rejectedBy.name} · ${fmtDate(r.rejectedAt)}` : fmtDate(r.rejectedAt)}
        </p>
        {r.rejectionReason && (
          <p className="text-muted-foreground">Razón: {r.rejectionReason}</p>
        )}
      </div>
    )
  }
  return null
}

function RequestMiniList({
  requests, showStatus, approvedCol, showRejection,
}: {
  requests: RequestRow[]
  showStatus?: boolean
  approvedCol?: boolean
  showRejection?: boolean
}) {
  return (
    <div className="space-y-1.5">
      {requests.slice(0, 20).map(r => (
        <div key={r.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
          <div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full mr-2 ${ENTITY_COLORS[r.entityType] ?? "bg-gray-100 text-gray-700"}`}>
              {ENTITY_LABELS[r.entityType] ?? r.entityType}
            </span>
            {r.title ?? `${r.entityType}:${r.entityId.slice(0, 6)}`}
            {r.amount != null && <span className="text-muted-foreground ml-1.5 text-xs">{fmtGTQ(r.amount)}</span>}
            {showRejection && r.rejectionReason && (
              <p className="text-xs text-red-600 mt-0.5">{r.rejectionReason}</p>
            )}
          </div>
          <div className="text-right shrink-0 ml-3">
            {showStatus && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ""}`}>
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
            )}
            {approvedCol && (
              <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(r.approvedAt)}</p>
            )}
            {!showStatus && !approvedCol && (
              <p className="text-xs text-muted-foreground">{fmtRelative(r.createdAt)}</p>
            )}
          </div>
        </div>
      ))}
      {requests.length > 20 && (
        <p className="text-xs text-muted-foreground pt-1">... y {requests.length - 20} más</p>
      )}
    </div>
  )
}

function OrphanActions({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    await markOrphanRejected(id)
    setLoading(false)
  }
  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? "..." : "Marcar rechazada"}
    </button>
  )
}

function StuckActions({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    await forceApprove(id)
    setLoading(false)
  }
  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
      title="Aprueba manualmente desde herramienta de diagnóstico"
    >
      {loading ? "..." : "Forzar aprobación"}
    </button>
  )
}

function FlowDiagram({ req, stuckSet }: { req: RequestRow; stuckSet: Set<string> }) {
  const isStuck = stuckSet.has(req.id)
  const url = entityUrl(req.entityType, req.entityId, req.relatedId)

  const steps: {
    label: string
    sublabel?: string
    date?: string | null
    done: boolean
    active: boolean
    error?: boolean
    icon: React.ReactNode
  }[] = [
    {
      label: "Solicitud creada",
      sublabel: `Por ${req.requestedBy.name}`,
      date: req.createdAt,
      done: true,
      active: false,
      icon: <Activity className="size-4" />,
    },
  ]

  if (req.status === "PENDING" || (req.status !== "REJECTED" && !req.cosignedAt)) {
    steps.push({
      label: "Esperando aprobación",
      sublabel: req.status === "PENDING" ? "Cualquier autorizador" : undefined,
      done: req.status !== "PENDING",
      active: req.status === "PENDING",
      error: isStuck && req.status === "PENDING",
      icon: <Clock className="size-4" />,
    })
  }

  if (req.status === "PENDING_COSIGN" || req.cosignedAt) {
    steps.push({
      label: "Co-firma",
      sublabel: req.cosigner ? `Por ${req.cosigner.name}` : "Esperando co-firmante",
      date: req.cosignedAt,
      done: !!req.cosignedAt,
      active: req.status === "PENDING_COSIGN",
      error: isStuck && req.status === "PENDING_COSIGN",
      icon: <Users className="size-4" />,
    })
  }

  if (req.status === "APPROVED") {
    steps.push({
      label: "Aprobado",
      sublabel: req.approvedBy ? `Por ${req.approvedBy.name}` : undefined,
      date: req.approvedAt,
      done: true,
      active: false,
      icon: <CheckCircle2 className="size-4" />,
    })
  }

  if (req.status === "REJECTED") {
    steps.push({
      label: "Rechazado",
      sublabel: req.rejectedBy ? `Por ${req.rejectedBy.name}` : undefined,
      date: req.rejectedAt,
      done: true,
      active: false,
      error: true,
      icon: <XCircle className="size-4" />,
    })
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Header info */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTITY_COLORS[req.entityType] ?? "bg-gray-100 text-gray-700"}`}>
              {ENTITY_LABELS[req.entityType] ?? req.entityType}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status] ?? ""}`}>
              {STATUS_LABELS[req.status] ?? req.status}
            </span>
            {isStuck && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
                <AlertTriangle className="size-3" /> Atorada
              </span>
            )}
          </div>
          <h3 className="font-semibold">{req.title ?? `${req.entityType}:${req.entityId.slice(0, 8)}`}</h3>
          {req.amount != null && <p className="text-muted-foreground text-sm">{fmtGTQ(req.amount)}</p>}
        </div>
        {url && (
          <Link href={url} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <ExternalLink className="size-4" /> Ver entidad
          </Link>
        )}
      </div>

      {/* Flow steps */}
      <div className="relative">
        <div className="flex items-start gap-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start flex-1">
              <div className="flex flex-col items-center">
                {/* Connector line left */}
                {i > 0 && (
                  <div className={`h-px w-full mt-5 -ml-px ${step.done ? "bg-foreground" : "bg-muted-foreground/30"}`} style={{ position: "absolute", left: 0, width: "100%" }} />
                )}
                <div className={`relative z-10 size-10 rounded-full flex items-center justify-center border-2 ${
                  step.error
                    ? "bg-red-100 border-red-400 text-red-600"
                    : step.done
                    ? "bg-foreground border-foreground text-background"
                    : step.active
                    ? "bg-amber-100 border-amber-400 text-amber-600 animate-pulse"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground/50"
                }`}>
                  {step.icon}
                </div>
              </div>
              <div className="ml-3 flex-1 pb-4">
                <p className={`text-sm font-medium ${step.error ? "text-red-600" : step.active ? "text-amber-600" : step.done ? "" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {step.sublabel && <p className="text-xs text-muted-foreground">{step.sublabel}</p>}
                {step.date && <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(step.date)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
        <div>
          <p className="text-xs text-muted-foreground">ID completo</p>
          <p className="font-mono text-xs mt-0.5 break-all">{req.id}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Entity ID</p>
          <p className="font-mono text-xs mt-0.5 break-all">{req.entityId}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Creada</p>
          <p className="mt-0.5">{fmtDate(req.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Última actualización</p>
          <p className="mt-0.5">{fmtDate(req.updatedAt)}</p>
        </div>
        {req.notes && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="mt-0.5">{req.notes}</p>
          </div>
        )}
        {req.rejectionReason && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Razón de rechazo</p>
            <p className="mt-0.5 text-red-700">{req.rejectionReason}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
