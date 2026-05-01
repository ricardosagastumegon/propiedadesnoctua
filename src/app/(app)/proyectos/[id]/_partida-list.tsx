"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatGTQ } from "@/lib/format"
import { PARTIDA_STATUSES, PARTIDA_STATUS_COLORS } from "@/lib/schemas/project"
import { createPartida, updatePartidaStatus, addPartidaPayment, deletePartida } from "../actions"
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"

interface Partida {
  id: string
  name: string
  description: string | null
  budgetEstimate: number | null
  status: string
  amountApproved: number | null
  amountPaid: number
  vendor: { name: string } | null
  approvedQuote: { total: number; vendor: { name: string } } | null
  payments: { id: string; amount: number; date: Date; method: string; reference: string | null }[]
}

interface Props {
  projectId: string
  partidas: Partida[]
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["QUOTING", "CANCELLED"],
  QUOTING: ["PENDING", "APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "ON_HOLD"],
  COMPLETED: [],
  CANCELLED: [],
}

export function PartidaList({ projectId, partidas }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [payForm, setPayForm] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const totalEstimate = partidas.reduce((s, p) => s + (p.budgetEstimate ?? 0), 0)
  const totalPaid = partidas.reduce((s, p) => s + p.amountPaid, 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      {partidas.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Partidas</p>
            <p className="font-display text-xl">{partidas.length}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Presupuesto</p>
            <p className="font-display text-xl tabular-nums">{formatGTQ(totalEstimate)}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Pagado</p>
            <p className="font-display text-xl tabular-nums text-emerald-600">{formatGTQ(totalPaid)}</p>
          </Card>
        </div>
      )}

      {/* List */}
      {partidas.map(p => (
        <Card key={p.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button onClick={() => setExpanded(e => e === p.id ? null : p.id)} className="mt-0.5 text-muted-foreground hover:text-foreground">
                {expanded === p.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PARTIDA_STATUS_COLORS[p.status]}`}>
                    {PARTIDA_STATUSES[p.status]}
                  </span>
                  {p.vendor && <span className="text-xs text-muted-foreground">{p.vendor.name}</span>}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {p.budgetEstimate != null && (
                <p className="text-xs text-muted-foreground">Est: {formatGTQ(p.budgetEstimate)}</p>
              )}
              {p.amountApproved != null && (
                <p className="text-xs font-medium">Aprobado: {formatGTQ(p.amountApproved)}</p>
              )}
              {p.amountPaid > 0 && (
                <p className="text-xs text-emerald-600">Pagado: {formatGTQ(p.amountPaid)}</p>
              )}
            </div>
          </div>

          {/* Expanded detail */}
          {expanded === p.id && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {/* Status change */}
              {STATUS_TRANSITIONS[p.status]?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Cambiar estado:</span>
                  {STATUS_TRANSITIONS[p.status].map(s => (
                    <button key={s} onClick={() => updatePartidaStatus(p.id, projectId, s)}
                      className={`text-xs px-2 py-1 rounded border hover:opacity-80 transition-opacity ${PARTIDA_STATUS_COLORS[s]}`}>
                      {PARTIDA_STATUSES[s]}
                    </button>
                  ))}
                </div>
              )}

              {/* Payments */}
              {p.payments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagos</p>
                  {p.payments.map(pay => (
                    <div key={pay.id} className="flex justify-between text-xs">
                      <span>{new Date(pay.date).toLocaleDateString("es-GT")} — {pay.method}{pay.reference ? ` (${pay.reference})` : ""}</span>
                      <span className="font-medium">{formatGTQ(pay.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add payment form */}
              {payForm === p.id ? (
                <form action={async (fd) => {
                  setLoading(true)
                  await addPartidaPayment(p.id, projectId, fd)
                  setPayForm(null)
                  setLoading(false)
                }} className="grid grid-cols-2 gap-2">
                  <input name="amount" type="number" step="0.01" placeholder="Monto" required
                    className="border rounded px-2 py-1 text-xs col-span-1 focus:outline-none focus:ring-1 focus:ring-ring" />
                  <input name="date" type="date" required
                    className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  <select name="method" required className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="TRANSFER">Transferencia</option>
                    <option value="CASH">Efectivo</option>
                    <option value="CHECK">Cheque</option>
                  </select>
                  <input name="reference" placeholder="Referencia (opcional)"
                    className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit" size="sm" disabled={loading}>Registrar pago</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPayForm(null)}>Cancelar</Button>
                  </div>
                </form>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setPayForm(p.id)}>
                  <Plus className="size-3.5 mr-1.5" />Registrar pago
                </Button>
              )}

              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                onClick={() => deletePartida(p.id, projectId)}>
                <Trash2 className="size-3.5 mr-1.5" />Eliminar partida
              </Button>
            </div>
          )}
        </Card>
      ))}

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
