"use client"
import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatGTQ, formatDate } from "@/lib/format"
import { PARTIDA_STATUS_COLORS, PAYMENT_TYPES } from "@/lib/schemas/project"
import {
  createPartida,
  addPartidaPayment,
  deletePartida,
  cancelPartida,
  markPartidaDelivered,
  requestQuoteApprovalForPartida,
} from "../actions"
import { Plus, Trash2, ChevronDown, ChevronRight, Star, ExternalLink, CheckCircle2, XCircle, Package } from "lucide-react"

interface QuoteItem { id: string; description: string; qty: number; unitPrice: number; total: number }
interface QuoteVendor { id: string; name: string; rating: number | null; phone: string | null; email: string | null }
interface Quote {
  id: string
  quoteNumber: string
  total: number
  status: string
  validUntil: Date | null
  notes: string | null
  vendor: QuoteVendor
  items: QuoteItem[]
}
interface Payment { id: string; amount: number; type: string; date: Date; method: string; reference: string | null }
interface Partida {
  id: string
  name: string
  description: string | null
  budgetEstimate: number | null
  status: string
  amountApproved: number
  amountPaid: number
  deliveredAt: Date | null
  vendor: { name: string } | null
  approvedQuote: { total: number; vendor: { name: string; id: string } } | null
  approvedQuoteId: string | null
  payments: Payment[]
  quotes: Quote[]
}

interface Props {
  projectId: string
  partidas: Partida[]
  authorityPolicy: string
}

function computeStatus(p: Partida): string {
  if (p.status === "CANCELLED") return "CANCELLED"
  if (p.amountApproved > 0 && p.amountPaid >= p.amountApproved && p.deliveredAt) return "PAID"
  if (p.deliveredAt) return "DELIVERED"
  if (p.amountPaid > 0) return "IN_PROGRESS"
  if (p.approvedQuoteId) return "APPROVED"
  if (p.quotes.some(q => q.status === "PENDING")) return "AWAITING_APPROVAL"
  if (p.quotes.length > 0) return "AWAITING_APPROVAL"
  return "PENDING_QUOTES"
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_QUOTES: "Sin cotizaciones",
  AWAITING_APPROVAL: "Esperando aprobacion",
  APPROVED: "Aprobada",
  IN_PROGRESS: "En progreso",
  DELIVERED: "Entregada",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
}

function StarRating({ value }: { value: number | null }) {
  if (!value) return null
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`size-3 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
      ))}
    </span>
  )
}

function QuoteCard({
  quote,
  projectId,
  partidaId,
  authorityPolicy,
  isApproved,
}: {
  quote: Quote
  projectId: string
  partidaId: string
  authorityPolicy: string
  isApproved: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const canApprove = authorityPolicy === "ALONE" || authorityPolicy === "COSIGN_REQUIRED"

  async function handleApprove() {
    if (!canApprove) return
    setLoading(true)
    await requestQuoteApprovalForPartida(partidaId, quote.id, projectId)
    setLoading(false)
  }

  return (
    <Card className={`p-3 border-2 ${isApproved ? "border-emerald-400" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{quote.vendor.name}</p>
          <StarRating value={quote.vendor.rating} />
          {quote.vendor.phone && <p className="text-xs text-muted-foreground">{quote.vendor.phone}</p>}
          {quote.vendor.email && <p className="text-xs text-muted-foreground truncate">{quote.vendor.email}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg tabular-nums">{formatGTQ(quote.total)}</p>
          {quote.validUntil && (
            <p className="text-xs text-muted-foreground">Válido: {formatDate(quote.validUntil)}</p>
          )}
          {isApproved && <Badge className="text-[10px] mt-1">Aprobada</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(o => !o)}>
          {open ? "Ocultar detalle" : "Ver detalle"}
        </Button>
        {canApprove && !isApproved && (
          <Button size="sm" className="h-7 text-xs" onClick={handleApprove} disabled={loading}>
            {authorityPolicy === "ALONE" ? "Aprobar esta" : "Solicitar aprobacion"}
          </Button>
        )}
      </div>

      {open && quote.items.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1">
          {quote.items.map(item => (
            <div key={item.id} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.description} × {item.qty}</span>
              <span className="tabular-nums">{formatGTQ(item.total)}</span>
            </div>
          ))}
          {quote.notes && <p className="text-xs text-muted-foreground pt-1 italic">{quote.notes}</p>}
        </div>
      )}
    </Card>
  )
}

export function PartidaList({ projectId, partidas, authorityPolicy }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [payForm, setPayForm] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-3">
      {partidas.map(p => {
        const computed = computeStatus(p)
        const colorClass = PARTIDA_STATUS_COLORS[computed] ?? "bg-gray-100 text-gray-700"
        const paidPct = p.amountApproved > 0 ? Math.min(100, (p.amountPaid / p.amountApproved) * 100) : 0
        const isExpanded = expanded === p.id
        const hasApprovedQuote = !!p.approvedQuoteId
        const isDone = computed === "PAID" || computed === "DELIVERED" || computed === "CANCELLED"

        return (
          <Card key={p.id} className="overflow-hidden">
            {/* Header row */}
            <button
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
              onClick={() => setExpanded(e => e === p.id ? null : p.id)}
            >
              {isExpanded ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>
                    {STATUS_LABELS[computed]}
                  </span>
                </div>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
              </div>
              <div className="text-right shrink-0 text-xs text-muted-foreground">
                {hasApprovedQuote
                  ? <span className="font-medium text-foreground">{formatGTQ(p.amountApproved)}</span>
                  : <span>{p.quotes.length} cotizacion{p.quotes.length !== 1 ? "es" : ""}</span>
                }
                {p.vendor && <p>{p.vendor.name}</p>}
              </div>
            </button>

            {/* Expanded body */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t pt-4 space-y-4">
                {/* Section A: No approved quote — show quote grid */}
                {!hasApprovedQuote && computed !== "CANCELLED" && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Cotizaciones ({p.quotes.length})
                    </p>
                    {p.quotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Sin cotizaciones aun.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {p.quotes.map(q => (
                          <QuoteCard
                            key={q.id}
                            quote={q}
                            projectId={projectId}
                            partidaId={p.id}
                            authorityPolicy={authorityPolicy}
                            isApproved={q.id === p.approvedQuoteId}
                          />
                        ))}
                      </div>
                    )}
                    <Button asChild variant="outline" size="sm" className="mt-3 h-7 text-xs">
                      <Link href={`/cotizaciones/nueva?projectId=${projectId}&partidaId=${p.id}`}>
                        <Plus className="size-3 mr-1" />Agregar cotizacion
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Section B/C: Has approved quote */}
                {hasApprovedQuote && (
                  <div className="space-y-4">
                    {/* Approved vendor card */}
                    <div className="rounded-lg border p-3 bg-emerald-50 dark:bg-emerald-950/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Proveedor aprobado</p>
                          <p className="font-medium">{p.approvedQuote?.vendor.name ?? p.vendor?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total aprobado</p>
                          <p className="font-display text-lg tabular-nums">{formatGTQ(p.amountApproved)}</p>
                        </div>
                      </div>
                      {/* Payment progress bar */}
                      {p.amountApproved > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Pagado: {formatGTQ(p.amountPaid)}</span>
                            <span>{paidPct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className={`rounded-full h-1.5 transition-all ${paidPct >= 100 ? "bg-emerald-500" : "bg-foreground"}`}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payments table */}
                    {p.payments.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pagos registrados</p>
                        <div className="space-y-1">
                          {p.payments.map(pay => (
                            <div key={pay.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                              <span className="text-muted-foreground">
                                {formatDate(pay.date)} — {pay.method}
                                {pay.reference ? ` (${pay.reference})` : ""}
                                {" · "}<span className="text-foreground">{PAYMENT_TYPES[pay.type] ?? pay.type}</span>
                              </span>
                              <span className="font-medium tabular-nums">{formatGTQ(pay.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Register payment form */}
                    {!isDone && payForm === p.id ? (
                      <form action={async (fd) => {
                        setLoading(true)
                        await addPartidaPayment(p.id, projectId, fd)
                        setPayForm(null)
                        setLoading(false)
                      }} className="grid grid-cols-2 gap-2 pt-1">
                        <input name="amount" type="number" step="0.01" placeholder="Monto *" required
                          className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                        <input name="date" type="date" required
                          className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                        <select name="type" className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                          <option value="ADVANCE">Anticipo</option>
                          <option value="PARTIAL" selected>Parcial</option>
                          <option value="FINAL">Pago final</option>
                        </select>
                        <select name="method" className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                          <option value="TRANSFER">Transferencia</option>
                          <option value="CASH">Efectivo</option>
                          <option value="CHECK">Cheque</option>
                        </select>
                        <input name="reference" placeholder="Referencia (opcional)"
                          className="border rounded px-2 py-1 text-xs col-span-2 focus:outline-none focus:ring-1 focus:ring-ring" />
                        <div className="col-span-2 flex gap-2">
                          <Button type="submit" size="sm" disabled={loading}>Registrar pago</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setPayForm(null)}>Cancelar</Button>
                        </div>
                      </form>
                    ) : !isDone && (
                      <Button size="sm" variant="outline" onClick={() => setPayForm(p.id)}>
                        <Plus className="size-3.5 mr-1.5" />Registrar pago
                      </Button>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
                  {computed === "IN_PROGRESS" || computed === "APPROVED" ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={async () => { setLoading(true); await markPartidaDelivered(p.id, projectId); setLoading(false) }}
                      disabled={loading}>
                      <CheckCircle2 className="size-3.5 mr-1" />Marcar entregada
                    </Button>
                  ) : null}
                  {computed !== "CANCELLED" && computed !== "PAID" && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={async () => { setLoading(true); await cancelPartida(p.id, projectId); setLoading(false) }}
                      disabled={loading}>
                      <XCircle className="size-3.5 mr-1" />Cancelar partida
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                    onClick={async () => { setLoading(true); await deletePartida(p.id, projectId); setLoading(false) }}
                    disabled={loading}>
                    <Trash2 className="size-3.5 mr-1" />Eliminar
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )
      })}

      {/* New partida form */}
      {showForm ? (
        <Card className="p-4">
          <form action={async (fd) => {
            setLoading(true)
            await createPartida(projectId, fd)
            setShowForm(false)
            setLoading(false)
          }} className="space-y-3">
            <p className="text-sm font-medium">Nueva partida</p>
            <input name="name" placeholder="Nombre de la partida *" required
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <input name="description" placeholder="Descripcion (opcional)"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <input name="budgetEstimate" type="number" step="0.01" placeholder="Presupuesto estimado"
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>Guardar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-4 mr-1.5" />Agregar partida
        </Button>
      )}
    </div>
  )
}
