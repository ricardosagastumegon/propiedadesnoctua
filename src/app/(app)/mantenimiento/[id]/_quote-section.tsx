"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addTicketQuote, selectTicketQuote } from "../actions"
import { EscalateButton } from "./_escalate-button"
import { formatGTQ } from "@/lib/format"
import { Plus, CheckCircle2, XCircle, Clock, FolderKanban } from "lucide-react"

interface Vendor { id: string; name: string }
interface Quote { id: string; vendorId: string; vendor: { name: string }; amount: number; status: string; notes: string | null }

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="size-4 text-muted-foreground" />,
  SELECTED: <CheckCircle2 className="size-4 text-emerald-500" />,
  REJECTED: <XCircle className="size-4 text-muted-foreground" />,
}

export function QuoteSection({
  ticketId,
  ticketTitle,
  quotes,
  vendors,
  canApprove,
  escalated,
}: {
  ticketId: string
  ticketTitle: string
  quotes: Quote[]
  vendors: Vendor[]
  canApprove: boolean
  escalated?: boolean
}) {
  const ref = useRef<HTMLFormElement>(null)
  const [vendorId, setVendorId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)

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

  async function handleSelect(quoteId: string) {
    setSelecting(quoteId)
    await selectTicketQuote(ticketId, quoteId)
    setSelecting(null)
  }

  return (
    <div className="space-y-3">
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin cotizaciones aún.</p>
      ) : (
        <div className="space-y-2">
          {quotes.map(q => (
            <div key={q.id} className={`flex items-center justify-between p-3 border rounded-lg ${q.status === "SELECTED" ? "border-emerald-300 bg-emerald-50/50" : ""}`}>
              <div className="flex items-center gap-2">
                {STATUS_ICONS[q.status]}
                <div>
                  <p className="text-sm font-medium">{q.vendor.name}</p>
                  {q.notes && <p className="text-xs text-muted-foreground">{q.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium tabular-nums">{formatGTQ(q.amount)}</span>
                {canApprove && q.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selecting === q.id}
                    onClick={() => handleSelect(q.id)}
                  >
                    {selecting === q.id ? "..." : "Seleccionar"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {quotes.length >= 2 && !escalated && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50/60">
          <FolderKanban className="size-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">¿Listo para ejecutar el trabajo?</p>
            <p className="text-xs text-blue-700 mt-0.5">Con {quotes.length} cotizaciones puedes convertir este ticket en un proyecto y gestionar partidas y pagos.</p>
          </div>
          <EscalateButton ticketId={ticketId} defaultName={ticketTitle} />
        </div>
      )}

      {!showForm ? (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-3 mr-1" /> Agregar cotizacion
        </Button>
      ) : (
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
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={loading}>{loading ? "..." : "Agregar"}</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  )
}
