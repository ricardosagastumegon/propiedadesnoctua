"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatGTQ } from "@/lib/format"

const METHODS_TICKET = [
  { value: "CAJA_CHICA", label: "Caja Chica" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CASH", label: "Efectivo" },
  { value: "REIMBURSEMENT", label: "Reembolso" },
]
const METHODS_PARTIDA = [
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CASH", label: "Efectivo" },
  { value: "CHECK", label: "Cheque" },
]
const PAYMENT_TYPES = [
  { value: "ADVANCE", label: "Anticipo" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "FINAL", label: "Pago final" },
]

export interface PaymentFormData {
  amount: number
  method: string
  date: string
  reference: string | null
  notes: string | null
  type?: string
  percentageOfTotal: number | null
  closesWithDiscount: boolean
  discountAmount: number | null
  discountReason: string | null
}

interface Props {
  totalAmount: number | null
  paidAmount: number
  mode: "ticket" | "partida"
  onSubmit: (data: PaymentFormData) => Promise<{ error?: string } | undefined>
  onCancel: () => void
  loading?: boolean
}

export function PaymentForm({ totalAmount, paidAmount, mode, onSubmit, onCancel, loading: externalLoading }: Props) {
  const ref = useRef<HTMLFormElement>(null)
  const [method, setMethod] = useState("")
  const [payType, setPayType] = useState("PARTIAL")
  const [calcMode, setCalcMode] = useState<"fixed" | "percentage">("fixed")
  const [pct, setPct] = useState(50)
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const pending = (totalAmount ?? 0) - paidAmount
  const methods = mode === "ticket" ? METHODS_TICKET : METHODS_PARTIDA

  const computedAmount = calcMode === "percentage" && totalAmount
    ? Math.max(0, (totalAmount * pct) / 100 - (applyDiscount ? (parseFloat((ref.current?.querySelector("[name=discountAmount]") as HTMLInputElement)?.value) || 0) : 0))
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!method) { setError("Selecciona un método de pago"); return }
    setLoading(true)
    setError("")

    const fd = ref.current!
    const rawAmount = calcMode === "percentage" && totalAmount
      ? (totalAmount * pct) / 100
      : parseFloat((fd.querySelector("[name=amount]") as HTMLInputElement).value)
    const discAmt = applyDiscount
      ? parseFloat((fd.querySelector("[name=discountAmount]") as HTMLInputElement)?.value || "0") || null
      : null
    const finalAmount = rawAmount - (discAmt ?? 0)

    if (!finalAmount || finalAmount <= 0) { setError("Monto inválido"); setLoading(false); return }

    const data: PaymentFormData = {
      amount: finalAmount,
      method,
      date: (fd.querySelector("[name=date]") as HTMLInputElement).value,
      reference: (fd.querySelector("[name=reference]") as HTMLInputElement)?.value || null,
      notes: (fd.querySelector("[name=notes]") as HTMLInputElement)?.value || null,
      type: mode === "partida" ? payType : undefined,
      percentageOfTotal: calcMode === "percentage" ? pct : null,
      closesWithDiscount: applyDiscount,
      discountAmount: discAmt,
      discountReason: applyDiscount
        ? (fd.querySelector("[name=discountReason]") as HTMLInputElement)?.value || null
        : null,
    }

    const res = await onSubmit(data)
    setLoading(false)
    if (res?.error) setError(typeof res.error === "string" ? res.error : "Error al registrar")
    else {
      ref.current?.reset()
      setMethod("")
      setPayType("PARTIAL")
      setCalcMode("fixed")
      setPct(50)
      setApplyDiscount(false)
      setError("")
    }
  }

  const isLoading = loading || externalLoading

  return (
    <form ref={ref} onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-muted/20">
      {/* Summary bar */}
      {totalAmount != null && totalAmount > 0 && (
        <div className="flex flex-wrap gap-4 text-sm p-3 bg-background rounded-md border">
          <span><span className="text-muted-foreground">Total: </span><strong className="tabular-nums">{formatGTQ(totalAmount)}</strong></span>
          <span><span className="text-muted-foreground">Pagado: </span><strong className="tabular-nums text-emerald-600">{formatGTQ(paidAmount)}</strong></span>
          <span><span className="text-muted-foreground">Pendiente: </span><strong className={`tabular-nums ${pending > 0 ? "text-amber-600" : "text-emerald-600"}`}>{formatGTQ(pending)}</strong></span>
        </div>
      )}

      {/* Type (partida only) */}
      {mode === "partida" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Tipo de pago</Label>
          <div className="flex gap-2">
            {PAYMENT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPayType(t.value)}
                className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                  payType === t.value ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calc mode */}
      {totalAmount != null && totalAmount > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Modo de cálculo</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCalcMode("fixed")}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                calcMode === "fixed" ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
              }`}
            >
              Monto fijo
            </button>
            <button
              type="button"
              onClick={() => setCalcMode("percentage")}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                calcMode === "percentage" ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
              }`}
            >
              Porcentaje
            </button>
          </div>
        </div>
      )}

      {/* Amount */}
      {calcMode === "fixed" || !totalAmount ? (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Monto (Q) *</Label>
          <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00"
            defaultValue={pending > 0 ? pending.toFixed(2) : ""} required />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Porcentaje: {pct}%</Label>
            <span className="text-sm font-medium tabular-nums text-blue-600">
              = {formatGTQ((totalAmount * pct) / 100)}
            </span>
          </div>
          <input
            type="range" min="1" max="100" step="1" value={pct}
            onChange={e => setPct(parseInt(e.target.value))}
            className="w-full accent-foreground"
          />
          <div className="flex gap-1.5">
            {[25, 50, 75, 100].map(p => (
              <button key={p} type="button" onClick={() => setPct(p)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  pct === p ? "bg-foreground text-background border-foreground" : "hover:bg-muted"
                }`}>
                {p}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Discount (FINAL type with underpayment) */}
      {(payType === "FINAL" || mode === "ticket") && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={applyDiscount}
              onChange={e => setApplyDiscount(e.target.checked)}
              className="rounded"
            />
            Cierra con descuento / condonación
          </label>
          {applyDiscount && (
            <div className="grid grid-cols-2 gap-2 pl-6">
              <div className="space-y-1">
                <Label className="text-xs">Monto descontado (Q)</Label>
                <Input name="discountAmount" type="number" min="0.01" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motivo</Label>
                <Input name="discountReason" placeholder="Ej: Negociación final" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Method, date, reference, notes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Método *</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {methods.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Fecha *</Label>
          <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Referencia</Label>
          <Input name="reference" placeholder="No. transferencia, cheque..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Notas</Label>
          <Input name="notes" placeholder="Observaciones..." />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={isLoading}>{isLoading ? "..." : "Registrar pago"}</Button>
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}
