"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { setPaymentMode } from "../actions"
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react"

const MODES = [
  { value: "PROVEEDOR", label: "Proveedor (cotizaciones)", hint: "Compará 2-3 cotizaciones, selecciono una." },
  { value: "CONTADO", label: "Contado (100% un solo pago)", hint: "⚠️ Requiere autorización siempre." },
  { value: "CAJA_CHICA", label: "Caja Chica", hint: "Pequeños gastos sin cotización formal." },
  { value: "EFECTIVO_RESPONSABLE", label: "Efectivo a responsable", hint: "Liquido al regreso con factura." },
  { value: "REEMBOLSO", label: "Reembolso", hint: "El responsable adelanta y reembolsamos." },
]

export function PaymentModeSelector({ ticketId, current }: { ticketId: string; current: string | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(mode: string) {
    setLoading(mode)
    setError(null)
    const res = await setPaymentMode(ticketId, mode)
    setLoading(null)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Modo de pago</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Define cómo se va a pagar este ticket. Influye en autorizaciones y aceptaciones requeridas.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MODES.map(m => (
          <button
            key={m.value}
            type="button"
            disabled={loading !== null}
            onClick={() => handleSelect(m.value)}
            className={`text-left border rounded-md p-2.5 text-xs transition-colors ${
              current === m.value
                ? "border-emerald-500 bg-emerald-50"
                : "hover:bg-muted"
            } disabled:opacity-50`}
          >
            <div className="flex items-center gap-1 font-medium">
              {current === m.value && <CheckCircle2 className="size-3 text-emerald-600" />}
              {m.label}
              {loading === m.value && <span className="text-muted-foreground">…</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{m.hint}</p>
          </button>
        ))}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="size-3" /> {error}
        </p>
      )}
      {current === "CONTADO" && (
        <p className="text-xs bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-amber-900">
          <strong>Pago Contado activado:</strong> el ticket se envió a autorizaciones. El pago final del 100% sólo se podrá registrar después de aprobado.
        </p>
      )}
    </div>
  )
}
