"use client"
import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { BackButton } from "@/components/shared/back-button"
import { formatGTQ } from "@/lib/format"
import { ApprovalCard } from "./approval-card"
import type { EnrichedItem, EntityData } from "../_types"
import {
  Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Filter, X,
} from "lucide-react"

// ── Entity type display labels ───────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  QUOTE: "Cotización",
  PARTIDA: "Partida",
  PROJECT_PARTIDA: "Cotización partida",
  CONTRACT: "Contrato",
  VENDOR_INVOICE: "Factura proveedor",
  INVOICE_MODIFIED: "Factura modificada",
  VENDOR: "Proveedor",
  PETTY_CASH: "Caja Chica",
  TICKET: "Mantenimiento",
}

// ── Property extraction helper ───────────────────────────────────────────

function extractProperty(entity: EntityData): { id: string; name: string } | null {
  if (!entity || entity.type === "UNKNOWN") return null
  switch (entity.type) {
    case "QUOTE": return entity.propertyId ? { id: entity.propertyId, name: entity.propertyName! } : null
    case "PARTIDA": return entity.propertyId ? { id: entity.propertyId, name: entity.propertyName! } : null
    case "CONTRACT": return { id: entity.propertyId, name: entity.propertyName }
    case "VENDOR_INVOICE": return entity.propertyId ? { id: entity.propertyId, name: entity.propertyName! } : null
    case "INVOICE_MODIFIED": return entity.propertyId ? { id: entity.propertyId, name: entity.propertyName! } : null
    case "PETTY_CASH": return { id: entity.propertyId, name: entity.propertyName }
    case "TICKET": return { id: entity.propertyId, name: entity.propertyName }
    default: return null
  }
}

function extractVendor(entity: EntityData): { id: string; name: string } | null {
  if (!entity || entity.type === "UNKNOWN") return null
  switch (entity.type) {
    case "QUOTE": return { id: entity.vendorId, name: entity.vendorName }
    case "PARTIDA": return entity.vendorId ? { id: entity.vendorId, name: entity.vendorName! } : null
    case "VENDOR_INVOICE": return { id: entity.vendorId, name: entity.vendorName }
    case "VENDOR": return { id: entity.vendorId, name: entity.name }
    case "TICKET": return entity.vendorId ? { id: entity.vendorId, name: entity.vendorName! } : null
    default: return null
  }
}

// ── Types ────────────────────────────────────────────────────────────────

interface Props {
  enriched: EnrichedItem[]
  currentUserId: string
  authorityPolicy: string
  role: string
  properties: { id: string; name: string }[]
  users: { id: string; name: string }[]
}

type StatusFilter = "pending" | "pending_cosign" | "approved" | "rejected" | "all"
type GroupBy = "" | "property" | "type" | "vendor" | "requester"

// ── Component ────────────────────────────────────────────────────────────

export function ApprovalsClient({ enriched, currentUserId, authorityPolicy, role, properties, users }: Props) {
  const isSuperAdmin = role === "ADMIN" || role === "OWNER"
  // Filters
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterProperty, setFilterProperty] = useState("")
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("pending")
  const [filterUser, setFilterUser] = useState("")
  const [search, setSearch] = useState("")
  const [groupBy, setGroupBy] = useState<GroupBy>("")
  const [showFilters, setShowFilters] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // ── KPIs ──
  const pendingAll = useMemo(
    () => enriched.filter(i => i.request.status === "PENDING" || i.request.status === "PENDING_COSIGN"),
    [enriched]
  )
  const pendingForMe = useMemo(
    () =>
      pendingAll.filter(i => {
        // Super admin can act on everything including own requests
        if (!isSuperAdmin && i.request.requestedBy.id === currentUserId) return false
        if (i.request.status === "PENDING") return true
        if (i.request.status === "PENDING_COSIGN" && (i.request.cosigner?.id === currentUserId || isSuperAdmin)) return true
        return false
      }),
    [pendingAll, currentUserId, isSuperAdmin]
  )
  const totalPendingAmount = useMemo(
    () => pendingAll.reduce((s, i) => s + (i.request.amount ?? 0), 0),
    [pendingAll]
  )
  const stuckCount = useMemo(
    () =>
      pendingAll.filter(
        i => Date.now() - new Date(i.request.updatedAt).getTime() > 72 * 3600 * 1000
      ).length,
    [pendingAll]
  )

  // ── Filtered list ──
  const filtered = useMemo(() => {
    return enriched.filter(item => {
      const r = item.request
      if (filterStatus === "pending" && r.status !== "PENDING" && r.status !== "PENDING_COSIGN") return false
      if (filterStatus === "pending_cosign" && r.status !== "PENDING_COSIGN") return false
      if (filterStatus === "approved" && r.status !== "APPROVED") return false
      if (filterStatus === "rejected" && r.status !== "REJECTED") return false
      if (filterTypes.length > 0 && !filterTypes.includes(r.entityType)) return false
      if (filterProperty) {
        const prop = extractProperty(item.entity)
        if (!prop || prop.id !== filterProperty) return false
      }
      if (filterUser && r.requestedBy.id !== filterUser) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(r.title?.toLowerCase().includes(q) ?? false)) return false
      }
      return true
    })
  }, [enriched, filterStatus, filterTypes, filterProperty, filterUser, search])

  // ── Grouped list ──
  type Group = { key: string; label: string; items: EnrichedItem[] }
  const grouped = useMemo((): Group[] => {
    if (!groupBy) return [{ key: "_all", label: "", items: filtered }]
    const map = new Map<string, Group>()
    for (const item of filtered) {
      let key = "_none"
      let label = "Sin grupo"
      if (groupBy === "property") {
        const p = extractProperty(item.entity)
        key = p?.id ?? "_none"
        label = p?.name ?? "Sin propiedad"
      } else if (groupBy === "type") {
        key = item.request.entityType
        label = ENTITY_LABELS[item.request.entityType] ?? item.request.entityType
      } else if (groupBy === "vendor") {
        const v = extractVendor(item.entity)
        key = v?.id ?? "_none"
        label = v?.name ?? "Sin proveedor"
      } else if (groupBy === "requester") {
        key = item.request.requestedBy.id
        label = item.request.requestedBy.name
      }
      if (!map.has(key)) map.set(key, { key, label, items: [] })
      map.get(key)!.items.push(item)
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [filtered, groupBy])

  // ── Active entity types in current dataset ──
  const availableTypes = useMemo(
    () => Array.from(new Set(enriched.map(i => i.request.entityType))),
    [enriched]
  )

  const hasActiveFilters = filterTypes.length > 0 || filterProperty || filterUser || search

  function clearFilters() {
    setFilterTypes([]); setFilterProperty(""); setFilterUser(""); setSearch("")
  }

  function toggleType(t: string) {
    setFilterTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  // Status tab items
  const statusTabs: { value: StatusFilter; label: string; count?: number }[] = [
    { value: "pending", label: "Pendientes", count: pendingAll.length },
    { value: "pending_cosign", label: "Co-firma", count: enriched.filter(i => i.request.status === "PENDING_COSIGN").length },
    { value: "approved", label: "Aprobadas", count: enriched.filter(i => i.request.status === "APPROVED").length },
    { value: "rejected", label: "Rechazadas", count: enriched.filter(i => i.request.status === "REJECTED").length },
    { value: "all", label: "Todas", count: enriched.length },
  ]

  const groupByOptions: { value: GroupBy; label: string }[] = [
    { value: "", label: "Sin agrupar" },
    { value: "property", label: "Por propiedad" },
    { value: "type", label: "Por tipo" },
    { value: "vendor", label: "Por proveedor" },
    { value: "requester", label: "Por solicitante" },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <BackButton href="/dashboard" label="Dashboard" />

      <PageHeader
        title="Autorizaciones"
        description="Solicitudes de aprobación pendientes y historial."
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => { setFilterStatus("pending"); setFilterUser(currentUserId === "" ? "" : currentUserId) }}
          className="text-left"
        >
          <Card className="p-4 hover:border-foreground/40 transition-colors cursor-pointer">
            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
              <Clock className="size-3" /> Para mí
            </p>
            <p className="font-display text-2xl tabular-nums text-blue-600">{pendingForMe.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">pendientes</p>
          </Card>
        </button>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Total pendientes</p>
          <p className="font-display text-2xl tabular-nums">{pendingAll.length}</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Monto pendiente</p>
          <p className="font-display text-lg tabular-nums">{formatGTQ(totalPendingAmount)}</p>
        </Card>

        <Card className={`p-4 ${stuckCount > 0 ? "border-destructive" : ""}`}>
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
            <AlertTriangle className="size-3" /> Atoradas &gt;72h
          </p>
          <p className={`font-display text-2xl tabular-nums ${stuckCount > 0 ? "text-destructive" : "text-emerald-600"}`}>
            {stuckCount}
          </p>
        </Card>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              filterStatus === tab.value
                ? "bg-foreground text-background font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 ${
                filterStatus === tab.value
                  ? "bg-background/20 text-background"
                  : "bg-background text-foreground"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-52"
          />

          {/* Property */}
          <select
            value={filterProperty}
            onChange={e => setFilterProperty(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          >
            <option value="">Todas las propiedades</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Solicitante */}
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5 bg-background"
          >
            <option value="">Todos los solicitantes</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          {/* Toggle type filter */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors ${
              filterTypes.length > 0 ? "border-foreground bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
            <Filter className="size-3.5" />
            Tipo
            {filterTypes.length > 0 && <span className="text-xs">({filterTypes.length})</span>}
            {showFilters ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="size-3" /> Limpiar
            </button>
          )}

          <p className="text-xs text-muted-foreground ml-auto">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Entity type pills */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {availableTypes.map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterTypes.includes(t)
                    ? "bg-foreground text-background border-foreground"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-foreground/40"
                }`}
              >
                {ENTITY_LABELS[t] ?? t}
              </button>
            ))}
          </div>
        )}

        {/* Group by */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Agrupar:</span>
          {groupByOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setGroupBy(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                groupBy === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "border-muted-foreground/30 text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Card list ── */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay solicitudes con los filtros actuales.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key}>
              {groupBy && (
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-display text-base font-semibold">{group.label}</h2>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {group.items.length}
                  </span>
                </div>
              )}
              <div className="space-y-3">
                {group.items.map(item => (
                  <ApprovalCard
                    key={item.request.id}
                    item={item}
                    currentUserId={currentUserId}
                    authorityPolicy={authorityPolicy}
                    role={role}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
