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
  amountApproved: number; amountPaid: number
  vendor: { name: string } | null
  payments: Payment[]
}

interface Props {
  partidas: Partida[]
  trail: ActivityEntry[]
}

type SubTab = "resumen" | "cronograma" | "trazabilidad"

export function PagosTab({ partidas, trail }: Props) {
  const [sub, setSub] = useState<SubTab>("resumen")

  const allPayments = partidas
    .flatMap(p => p.payments.map(pay => ({ ...pay, partidaName: p.name, vendorName: p.vendor?.name ?? "—" })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Resumen por proveedor
  const vendorMap = new Map<string, { name: string; committed: number; paid: number; payments: number }>()
  for (const p of partidas) {
    if (!p.vendor) continue
    const entry = vendorMap.get(p.vendor.name) ?? { name: p.vendor.name, committed: 0, paid: 0, payments: 0 }
    entry.committed += p.amountApproved ?? 0
    entry.paid += p.amountPaid
    entry.payments += p.payments.length
    vendorMap.set(p.vendor.name, entry)
  }
  const vendorRows = Array.from(vendorMap.values()).sort((a, b) => b.committed - a.committed)

  const totalCommitted = vendorRows.reduce((s, r) => s + r.committed, 0)
  const totalPaid = vendorRows.reduce((s, r) => s + r.paid, 0)

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
          {vendorRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin partidas aprobadas aún.</p>
          ) : (
            <>
              {vendorRows.map(v => {
                const pct = v.committed > 0 ? Math.min(100, (v.paid / v.committed) * 100) : 0
                return (
                  <Card key={v.name} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.payments} pago{v.payments !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Comprometido: <span className="font-medium text-foreground tabular-nums">{formatGTQ(v.committed)}</span></p>
                        <p className="text-emerald-600 font-medium tabular-nums">{formatGTQ(v.paid)} pagado</p>
                        {v.committed - v.paid > 0 && (
                          <p className="text-destructive tabular-nums">Saldo: {formatGTQ(v.committed - v.paid)}</p>
                        )}
                      </div>
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
