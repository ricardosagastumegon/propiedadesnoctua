"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { formatGTQ, formatDate } from "@/lib/format"
import { PAYMENT_TYPES } from "@/lib/schemas/project"
import { ActivityTrail } from "./_activity-trail"
import type { ActivityEntry } from "@/lib/project-activity-trail"

interface Payment {
  id: string; amount: number; type: string; date: Date | string
  method: string; reference: string | null
  percentageOfTotal: number | null; closesWithDiscount: boolean; discountAmount: number | null
}
interface Partida {
  id: string; name: string
  status: string
  amountApproved: number; amountPaid: number
  deliveredAt: Date | null
  vendor: { name: string } | null
  payments: Payment[]
}

interface Props {
  partidas: Partida[]
  trail: ActivityEntry[]
}

type SubTab = "resumen" | "cronograma" | "trazabilidad"

const WORK_STATUS: Record<string, { label: string; color: string }> = {
  PAID:              { label: "Pagada ✓",        color: "bg-emerald-100 text-emerald-800" },
  DELIVERED:         { label: "Entregada",        color: "bg-blue-100 text-blue-800" },
  IN_PROGRESS:       { label: "En progreso",      color: "bg-amber-100 text-amber-800" },
  APPROVED:          { label: "Aprobada",         color: "bg-purple-100 text-purple-800" },
  AWAITING_APPROVAL: { label: "Esp. aprobación",  color: "bg-gray-100 text-gray-600" },
  PENDING_QUOTES:    { label: "Sin cotización",   color: "bg-gray-100 text-gray-500" },
  CANCELLED:         { label: "Cancelada",        color: "bg-red-100 text-red-700" },
}

function computeDisplay(p: Partida): string {
  if (p.status === "CANCELLED") return "CANCELLED"
  const approved = p.amountApproved ?? 0
  if (approved > 0 && p.amountPaid >= approved && p.deliveredAt) return "PAID"
  if (p.deliveredAt) return "DELIVERED"
  if (p.amountPaid > 0) return "IN_PROGRESS"
  if (approved > 0) return "APPROVED"
  return "PENDING_QUOTES"
}

export function PagosTab({ partidas, trail }: Props) {
  const [sub, setSub] = useState<SubTab>("resumen")

  const allPayments = partidas
    .flatMap(p => p.payments.map(pay => ({ ...pay, partidaName: p.name, vendorName: p.vendor?.name ?? "—" })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Resumen por proveedor — group partidas by vendor
  const vendorMap = new Map<string, { name: string; partidas: Partida[] }>()
  for (const p of partidas) {
    if (!p.vendor) continue
    const entry = vendorMap.get(p.vendor.name) ?? { name: p.vendor.name, partidas: [] }
    entry.partidas.push(p)
    vendorMap.set(p.vendor.name, entry)
  }
  const vendorRows = Array.from(vendorMap.values()).sort((a, b) => {
    const aTotal = a.partidas.reduce((s, p) => s + (p.amountApproved ?? 0), 0)
    const bTotal = b.partidas.reduce((s, p) => s + (p.amountApproved ?? 0), 0)
    return bTotal - aTotal
  })

  const totalCommitted = partidas.reduce((s, p) => s + (p.amountApproved ?? 0), 0)
  const totalPaid = partidas.reduce((s, p) => s + p.amountPaid, 0)

  // Overall project status counts
  const statusCounts = partidas.reduce((acc, p) => {
    const d = computeDisplay(p)
    acc[d] = (acc[d] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const completedCount = (statusCounts["PAID"] ?? 0) + (statusCounts["DELIVERED"] ?? 0)
  const progressPct = partidas.length > 0 ? Math.round((completedCount / partidas.length) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex gap-1 border-b pb-0">
        {(["resumen", "cronograma", "trazabilidad"] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
              sub === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "resumen" ? "Resumen por proveedor" : t === "cronograma" ? "Cronograma de pagos" : "Trazabilidad"}
            {t === "trazabilidad" && trail.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{trail.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Resumen por proveedor */}
      {sub === "resumen" && (
        <div className="space-y-3">
          {/* Overall progress bar */}
          {partidas.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Avance general del proyecto</span>
                <span className="font-display text-lg tabular-nums">{progressPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`rounded-full h-2 transition-all ${progressPct >= 100 ? "bg-emerald-500" : "bg-foreground"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const cfg = WORK_STATUS[status]
                  if (!cfg) return null
                  return (
                    <span key={status} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                      {count} {cfg.label}
                    </span>
                  )
                })}
              </div>
            </Card>
          )}

          {vendorRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin partidas aprobadas aún.</p>
          ) : (
            <>
              {vendorRows.map(v => {
                const committed = v.partidas.reduce((s, p) => s + (p.amountApproved ?? 0), 0)
                const paid = v.partidas.reduce((s, p) => s + p.amountPaid, 0)
                const pct = committed > 0 ? Math.min(100, (paid / committed) * 100) : 0
                const payCount = v.partidas.reduce((s, p) => s + p.payments.length, 0)
                return (
                  <Card key={v.name} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{payCount} pago{payCount !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Comprometido: <span className="font-medium text-foreground tabular-nums">{formatGTQ(committed)}</span></p>
                        <p className="text-emerald-600 font-medium tabular-nums">{formatGTQ(paid)} pagado</p>
                        {committed - paid > 0 && (
                          <p className="text-destructive tabular-nums">Saldo: {formatGTQ(committed - paid)}</p>
                        )}
                      </div>
                    </div>

                    {/* Partidas list with status */}
                    <div className="space-y-1.5 mb-3">
                      {v.partidas.map(p => {
                        const displayStatus = computeDisplay(p)
                        const cfg = WORK_STATUS[displayStatus]
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate mr-2">{p.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {(p.amountApproved ?? 0) > 0 && (
                                <span className="tabular-nums">{formatGTQ(p.amountPaid)} / {formatGTQ(p.amountApproved)}</span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded-full font-medium ${cfg?.color ?? "bg-muted text-muted-foreground"}`}>
                                {cfg?.label ?? displayStatus}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className={`rounded-full h-1.5 transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-foreground"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% pagado</p>
                  </Card>
                )
              })}

              <Card className="p-4 bg-muted/40">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total comprometido</span>
                  <span className="tabular-nums">{formatGTQ(totalCommitted)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600 mt-1">
                  <span>Total pagado</span>
                  <span className="tabular-nums">{formatGTQ(totalPaid)}</span>
                </div>
                {totalCommitted - totalPaid > 0 && (
                  <div className="flex justify-between text-sm text-destructive mt-1">
                    <span>Saldo pendiente</span>
                    <span className="tabular-nums">{formatGTQ(totalCommitted - totalPaid)}</span>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* Cronograma de pagos */}
      {sub === "cronograma" && (
        <div className="space-y-2">
          {allPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos registrados aún.</p>
          ) : allPayments.map(pay => (
            <div key={pay.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{pay.partidaName}</p>
                <p className="text-xs text-muted-foreground">
                  {pay.vendorName} · {pay.method}
                  {pay.reference && ` · Ref: ${pay.reference}`}
                  {" · "}<span>{PAYMENT_TYPES[pay.type] ?? pay.type}</span>
                  {pay.percentageOfTotal != null && <span className="ml-1">({pay.percentageOfTotal}%)</span>}
                  {pay.closesWithDiscount && pay.discountAmount && <span className="ml-1 text-amber-600">desc.{formatGTQ(pay.discountAmount)}</span>}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="font-medium tabular-nums">{formatGTQ(pay.amount)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(new Date(pay.date))}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trazabilidad */}
      {sub === "trazabilidad" && (
        <ActivityTrail trail={trail} />
      )}
    </div>
  )
}
