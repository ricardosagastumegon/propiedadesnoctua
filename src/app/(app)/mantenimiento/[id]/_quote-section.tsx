"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { addTicketQuote, finalizeTicketSelection } from "../actions"
import { EscalateButton } from "./_escalate-button"
import { formatGTQ, formatDate } from "@/lib/format"
import { QuoteForm, type QuoteFormData, type QuoteVendor } from "@/components/shared/quote-form"
import { Plus, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldAlert, ArrowUpRight } from "lucide-react"

type Vendor = QuoteVendor
interface QuoteItem { id: string; description: string; quantity: number; unit: string | null; unitPrice: number; total: number }
interface Quote { id: string; vendorId: string; vendor: { name: string; phone?: string | null; rating?: number | null }; total: number; subtotal?: number; taxAmount?: number; status: string; notes: string | null; validUntil?: Date | null; vendorReference?: string | null; items?: QuoteItem[] }

function TotalBadge({ total, authThreshold, projectThreshold }: { total: number; authThreshold: number; projectThreshold: number }) {
  if (total >= projectThreshold) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
        <ArrowUpRight className="size-2.5" />Debe ser proyecto
      </span>
    )
  }
  if (total >= authThreshold) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
        <ShieldAlert className="size-2.5" />Requiere autorización
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
      Sin autorización
    </span>
  )
}

export function QuoteSection({
  ticketId,
  ticketTitle,
  quotes,
  vendors,
  canApprove,
  escalated,
  authThreshold = 1000,
  projectThreshold = 4000,
  approvalPending = false,
}: {
  ticketId: string
  ticketTitle: string
  quotes: Quote[]
  vendors: Vendor[]
  canApprove: boolean
  escalated?: boolean
  authThreshold?: number
  projectThreshold?: number
  approvalPending?: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState("")
  const [sentToAuth, setSentToAuth] = useState<string | null>(null)

  const hasSelected = quotes.some(q => q.status === "SELECTED")
  const anyAboveProjectThreshold = quotes.some(q => q.total >= projectThreshold)

  const runningTotal = Array.from(localSelected).reduce((sum, id) => {
    const q = quotes.find(q => q.id === id)
    return sum + (q?.total ?? 0)
  }, 0)

  const totalAboveProject = runningTotal >= projectThreshold
  const totalRequiresAuth = runningTotal >= authThreshold && runningTotal < projectThreshold
  const hasLocalSelection = localSelected.size > 0

  function toggleQuote(id: string) {
    setLocalSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setFinalizeError("")
    setSentToAuth(null)
  }

  async function handleAdd(data: QuoteFormData) {
    const fd = new FormData()
    fd.set("vendorId", data.vendorId)
    fd.set("taxPercent", data.taxPercent.toString())
    if (data.vendorReference) fd.set("vendorReference", data.vendorReference)
    if (data.validUntil) fd.set("validUntil", data.validUntil)
    if (data.notes) fd.set("notes", data.notes)
    fd.set("items", JSON.stringify(data.items))
    const res = await addTicketQuote(ticketId, fd)
    if (!res?.error) setShowForm(false)
    return res
  }

  async function handleFinalize() {
    if (!hasLocalSelection) return
    if (totalAboveProject) {
      setFinalizeError(`El total (${formatGTQ(runningTotal)}) supera Q${projectThreshold.toLocaleString()}. Debe convertir a proyecto.`)
      return
    }
    setFinalizing(true)
    setFinalizeError("")
    setSentToAuth(null)
    try {
      const res = await finalizeTicketSelection(ticketId, Array.from(localSelected))
      setFinalizing(false)
      if (res?.error) {
        setFinalizeError(res.error)
      } else if (res?.requiresApproval) {
        const names = Array.from(localSelected)
          .map(id => quotes.find(q => q.id === id)?.vendor.name ?? "")
          .filter(Boolean)
          .join(", ")
        setSentToAuth(`${names} — ${formatGTQ(runningTotal)}`)
        setLocalSelected(new Set())
      } else if (res?.ok) {
        setLocalSelected(new Set())
      }
    } catch {
      setFinalizing(false)
      setFinalizeError("Error al procesar la selección. Intenta de nuevo.")
    }
  }

  return (
    <div className="space-y-3">
      {quotes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Agrega cotizaciones de uno o varios proveedores para comparar precios antes de seleccionar.
        </p>
      )}

      {/* Force escalate banner — any quote above Q4,000 */}
      {anyAboveProjectThreshold && !escalated && !hasSelected && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50">
          <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Cotización supera Q{projectThreshold.toLocaleString()}</p>
            <p className="text-xs text-red-700 mt-0.5">
              Trabajos de este monto deben gestionarse como Proyecto para tener control de partidas, pagos y autorizaciones.
            </p>
          </div>
          <EscalateButton ticketId={ticketId} defaultName={ticketTitle} />
        </div>
      )}

      {quotes.length > 0 && (
        <div className="space-y-2">
          {quotes.map(q => {
            const isPending = q.status === "PENDING"
            const isLocallySelected = localSelected.has(q.id)
            const [expanded, setExp] = [expandedId === q.id, (b: boolean) => setExpandedId(b ? q.id : null)]
            return (
              <div key={q.id} className={`border rounded-lg ${
                q.status === "SELECTED" ? "border-emerald-300 bg-emerald-50/50" :
                q.status === "REJECTED" ? "opacity-50" :
                isLocallySelected ? "border-blue-300 bg-blue-50/30" : ""
              }`}>
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {isPending && !isLocallySelected && <Clock className="size-4 text-muted-foreground shrink-0" />}
                    {isPending && isLocallySelected && <CheckCircle2 className="size-4 text-blue-500 shrink-0" />}
                    {q.status === "SELECTED" && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
                    {q.status === "REJECTED" && <XCircle className="size-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{q.vendor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.items?.length ?? 0} rubro{q.items?.length !== 1 ? "s" : ""}
                        {q.validUntil && <span> · válida hasta {formatDate(new Date(q.validUntil))}</span>}
                        {q.vendorReference && <span> · ref {q.vendorReference}</span>}
                      </p>
                      {q.status === "REJECTED" && <p className="text-xs text-muted-foreground italic">No seleccionada</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-sm font-medium tabular-nums">{formatGTQ(q.total)}</span>
                    {q.items && q.items.length > 0 && (
                      <button type="button" onClick={() => setExp(!expanded)} className="text-xs text-blue-600 hover:underline">
                        {expanded ? "Ocultar" : "Ver"} detalle
                      </button>
                    )}
                    {canApprove && isPending && !hasSelected && !approvalPending && (
                      <Button
                        size="sm"
                        variant={isLocallySelected ? "default" : "outline"}
                        onClick={() => toggleQuote(q.id)}
                      >
                        {isLocallySelected ? "✓ Quitar" : "Seleccionar"}
                      </Button>
                    )}
                  </div>
                </div>
                {expanded && q.items && q.items.length > 0 && (
                  <div className="border-t p-3 bg-muted/20">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium pb-1">Descripción</th>
                          <th className="text-right font-medium pb-1 w-12">Cant.</th>
                          <th className="text-left font-medium pb-1 w-16">Unidad</th>
                          <th className="text-right font-medium pb-1 w-20">P. Unit.</th>
                          <th className="text-right font-medium pb-1 w-20">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.items.map(it => (
                          <tr key={it.id} className="border-t border-muted-foreground/10">
                            <td className="py-1">{it.description}</td>
                            <td className="text-right py-1">{it.quantity}</td>
                            <td className="py-1">{it.unit ?? "—"}</td>
                            <td className="text-right py-1 tabular-nums">{formatGTQ(it.unitPrice)}</td>
                            <td className="text-right py-1 tabular-nums font-medium">{formatGTQ(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="text-muted-foreground">
                        <tr><td colSpan={4} className="text-right pt-1">Subtotal</td><td className="text-right tabular-nums">{formatGTQ(q.subtotal ?? 0)}</td></tr>
                        {(q.taxAmount ?? 0) > 0 && <tr><td colSpan={4} className="text-right">IVA</td><td className="text-right tabular-nums">{formatGTQ(q.taxAmount!)}</td></tr>}
                        <tr><td colSpan={4} className="text-right font-medium text-foreground pt-1">Total</td><td className="text-right tabular-nums font-medium text-foreground">{formatGTQ(q.total)}</td></tr>
                      </tfoot>
                    </table>
                    {q.notes && <p className="text-xs text-muted-foreground mt-2 italic">{q.notes}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Running total + finalize */}
      {hasLocalSelection && !hasSelected && (
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-blue-900">
                Total ({localSelected.size} proveedor{localSelected.size !== 1 ? "es" : ""})
              </span>
              <TotalBadge total={runningTotal} authThreshold={authThreshold} projectThreshold={projectThreshold} />
            </div>
            <span className="text-sm font-bold text-blue-900 tabular-nums">{formatGTQ(runningTotal)}</span>
          </div>
          {!totalAboveProject && (
            <Button
              size="sm"
              disabled={finalizing}
              onClick={handleFinalize}
              className="w-full"
            >
              {finalizing ? "Procesando..." :
               totalRequiresAuth ? "Enviar a autorizar" :
               "Confirmar selección"}
            </Button>
          )}
          {totalAboveProject && (
            <p className="text-xs text-red-700">
              Supera Q{projectThreshold.toLocaleString()} — debe convertir este ticket a proyecto.
            </p>
          )}
        </div>
      )}

      {/* Finalize error */}
      {finalizeError && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{finalizeError}</span>
        </div>
      )}

      {/* Sent to authorization success */}
      {sentToAuth && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-medium">Enviado a autorizaciones</p>
            <p className="text-xs text-amber-700 mt-0.5">{sentToAuth} — pendiente de aprobación</p>
          </div>
        </div>
      )}

      {/* Approval in-flight notice */}
      {approvalPending && !hasSelected && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Autorización pendiente — las acciones de selección están bloqueadas hasta que se resuelva.
        </p>
      )}

      {/* Add quote button */}
      {!showForm && !hasSelected && (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-3 mr-1" /> Agregar cotizacion
        </Button>
      )}
      {!showForm && hasSelected && (
        <p className="text-xs text-muted-foreground italic">Proveedor ya seleccionado.</p>
      )}

      {showForm && (
        <div className="border rounded-lg p-4">
          <QuoteForm
            context={{ type: "TICKET", id: ticketId }}
            vendors={vendors}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
          />
          <p className="text-xs text-muted-foreground mt-2">
            &gt;Q{authThreshold.toLocaleString()} requiere autorización · &gt;Q{projectThreshold.toLocaleString()} debe ser proyecto
          </p>
        </div>
      )}
    </div>
  )
}
