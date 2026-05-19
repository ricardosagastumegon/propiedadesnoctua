"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addTicketQuote, finalizeTicketSelection } from "../actions"
import { EscalateButton } from "./_escalate-button"
import { formatGTQ } from "@/lib/format"
import { Plus, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldAlert, ArrowUpRight } from "lucide-react"

interface Vendor { id: string; name: string }
interface Quote { id: string; vendorId: string; vendor: { name: string }; amount: number; status: string; notes: string | null }

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
  const ref = useRef<HTMLFormElement>(null)
  const [vendorId, setVendorId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  const [finalizing, setFinalizing] = useState(false)
  const [finalizeError, setFinalizeError] = useState("")
  const [sentToAuth, setSentToAuth] = useState<string | null>(null)

  const hasSelected = quotes.some(q => q.status === "SELECTED")
  const anyAboveProjectThreshold = quotes.some(q => q.amount >= projectThreshold)

  const runningTotal = Array.from(localSelected).reduce((sum, id) => {
    const q = quotes.find(q => q.id === id)
    return sum + (q?.amount ?? 0)
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const fd = new FormData(ref.current!)
    fd.set("vendorId", vendorId)
    const res = await addTicketQuote(ticketId, fd)
    setLoading(false)
    if (res?.error) setError(typeof res.error === "string" ? res.error : "Error")
    else { ref.current?.reset(); setVendorId(""); setShowForm(false) }
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
            return (
              <div key={q.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                q.status === "SELECTED" ? "border-emerald-300 bg-emerald-50/50" :
                q.status === "REJECTED" ? "opacity-50" :
                isLocallySelected ? "border-blue-300 bg-blue-50/30" : ""
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  {isPending && !isLocallySelected && <Clock className="size-4 text-muted-foreground shrink-0" />}
                  {isPending && isLocallySelected && <CheckCircle2 className="size-4 text-blue-500 shrink-0" />}
                  {q.status === "SELECTED" && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
                  {q.status === "REJECTED" && <XCircle className="size-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{q.vendor.name}</p>
                    {q.notes && <p className="text-xs text-muted-foreground truncate">{q.notes}</p>}
                    {q.status === "REJECTED" && <p className="text-xs text-muted-foreground italic">No seleccionada</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-sm font-medium tabular-nums">{formatGTQ(q.amount)}</span>
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
        <form ref={ref} onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Proveedor *</Label>
              <Select value={vendorId} onValueChange={setVendorId} required>
                <SelectTrigger><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monto (Q) *</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Notas</Label>
              <Textarea name="notes" rows={2} placeholder="Descripcion del trabajo..." />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 items-center">
            <Button size="sm" type="submit" disabled={loading}>{loading ? "..." : "Agregar"}</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <p className="text-xs text-muted-foreground ml-1">
              &gt;Q{authThreshold.toLocaleString()} requiere autorización · &gt;Q{projectThreshold.toLocaleString()} debe ser proyecto
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
