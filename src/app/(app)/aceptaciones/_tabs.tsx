"use client"
import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatGTQ, formatDate } from "@/lib/format"
import { BadgeCheck, Clock, CheckCircle2, XCircle, ArrowRight, Phone, Building2, Wrench, FolderKanban, User as UserIcon, Star } from "lucide-react"

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

type Tab = "pendientes" | "aceptadas" | "rechazadas" | "todas"

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  SUPERSEDED: "bg-gray-100 text-gray-600",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  SUPERSEDED: "Reemplazada",
}

export function AcceptanceTabs({ rows, canAct }: { rows: EnrichedRow[]; canAct: boolean }) {
  const [tab, setTab] = useState<Tab>("pendientes")

  const filtered = (() => {
    if (tab === "pendientes") return rows.filter(r => r.status === "PENDING")
    if (tab === "aceptadas") return rows.filter(r => r.status === "ACCEPTED")
    if (tab === "rechazadas") return rows.filter(r => r.status === "REJECTED")
    return rows
  })()

  const counts = {
    pendientes: rows.filter(r => r.status === "PENDING").length,
    aceptadas: rows.filter(r => r.status === "ACCEPTED").length,
    rechazadas: rows.filter(r => r.status === "REJECTED").length,
    todas: rows.length,
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {(["pendientes", "aceptadas", "rechazadas", "todas"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
              tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{counts[t]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No hay aceptaciones en esta categoría.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(r => {
            const total = r.amountApproved ?? 0
            const pct = total > 0 ? Math.round((r.amountPaid / total) * 100) : 0
            const saldoPct = Math.max(0, 100 - pct)
            const cap = 80 // displayed for reference only
            const liberaPct = Math.max(0, 100 - cap)
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status] ?? ""}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {r.entityType === "PARTIDA" ? <FolderKanban className="size-3 inline mr-1" /> : <Wrench className="size-3 inline mr-1" />}
                        {r.entityType === "PARTIDA" ? "Partida" : "Ticket"}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">{r.entityName}</p>
                    {(r.projectName || r.propertyName) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="size-3" />
                        {r.projectName ? r.projectName : ""}
                        {r.projectName && r.propertyName ? " · " : ""}
                        {r.propertyName}
                      </p>
                    )}
                  </div>
                  {r.rating && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`size-3 ${n <= r.rating! ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                      ))}
                    </div>
                  )}
                </div>

                {r.vendor && (
                  <p className="text-xs flex items-center gap-1 mb-1">
                    <UserIcon className="size-3 text-muted-foreground" />
                    <span className="font-medium">{r.vendor.name}</span>
                    {r.vendor.phone && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <Phone className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{r.vendor.phone}</span>
                      </>
                    )}
                  </p>
                )}

                {total > 0 && (
                  <div className="text-xs space-y-0.5 mb-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto</span>
                      <span className="font-medium tabular-nums">{formatGTQ(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pagado</span>
                      <span className="tabular-nums text-emerald-600">{formatGTQ(r.amountPaid)} ({pct}%)</span>
                    </div>
                    {r.status === "PENDING" && saldoPct > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Saldo a liberar</span>
                        <span className="tabular-nums text-amber-600">{saldoPct}%</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mb-3">
                  Solicitada por <span className="font-medium text-foreground">{r.requestedByName}</span>
                  <span className="mx-1">·</span>
                  {formatDate(new Date(r.requestedAt))}
                </div>

                {r.status === "ACCEPTED" && r.acceptedByName && (
                  <div className="text-xs text-emerald-700 mb-2">
                    ✓ Aceptada por <span className="font-medium">{r.acceptedByName}</span>
                    {r.acceptedAt && <span> · {formatDate(new Date(r.acceptedAt))}</span>}
                  </div>
                )}
                {r.status === "REJECTED" && r.rejectedByName && (
                  <div className="text-xs text-red-700 mb-2">
                    ✗ Rechazada por <span className="font-medium">{r.rejectedByName}</span>
                    {r.rejectionReason && <span className="block italic">«{r.rejectionReason}»</span>}
                  </div>
                )}
                {r.hash && r.status === "ACCEPTED" && (
                  <p className="text-[10px] font-mono text-muted-foreground truncate mb-2">hash: {r.hash.slice(0, 24)}…</p>
                )}

                <div className="flex justify-end">
                  <Link href={`/aceptaciones/${r.id}`}>
                    <Button size="sm" variant={r.status === "PENDING" ? "default" : "outline"}>
                      {r.status === "PENDING" && canAct ? "Revisar y aceptar" : "Ver detalle"}
                      <ArrowRight className="size-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
