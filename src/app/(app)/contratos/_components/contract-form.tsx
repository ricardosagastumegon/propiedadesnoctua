"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { PAYMENT_FREQUENCY } from "@/lib/schemas/contract"
import type { Property, Tenant } from "@prisma/client"

export interface ParcelOption { id: string; name: string | null; cadastralNumber: string | null }

interface Props {
  properties: Property[]
  tenants: Tenant[]
  parcelsByProperty?: Record<string, ParcelOption[]>
  defaultPropertyId?: string
  defaultTenantId?: string
  suggestedNumber?: string
  action: (fd: FormData) => Promise<any>
}

export function ContractForm({ properties, tenants, parcelsByProperty = {}, defaultPropertyId, defaultTenantId, suggestedNumber, action }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "")
  const [tenantId, setTenantId] = useState(defaultTenantId ?? "")
  const [parcelId, setParcelId] = useState("")
  const [frequency, setFrequency] = useState("MONTHLY")
  const [status, setStatus] = useState("DRAFT")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const availableParcels = parcelsByProperty[propertyId] ?? []
  const FIELD_LABELS: Record<string, string> = {
    contractNumber: "N. de contrato", propertyId: "Finca/Propiedad", tenantId: "Inquilino",
    startDate: "Fecha de inicio", endDate: "Fecha de fin", monthlyRent: "Renta mensual",
    paymentDueDay: "Día de pago",
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    if (!propertyId) { toast.error("Seleccioná la finca/propiedad."); return }
    if (!tenantId) { toast.error("Seleccioná el inquilino."); return }
    const fd = new FormData(formRef.current!)
    fd.set("propertyId", propertyId)
    fd.set("tenantId", tenantId)
    fd.set("parcelId", parcelId)
    fd.set("paymentFrequency", frequency)
    fd.set("status", status)
    startTransition(async () => {
      const res = await action(fd)
      if (res?.error) {
        const errs = (typeof res.error === "object" && res.error !== null) ? res.error as Record<string, string[]> : {}
        setFieldErrors(errs)
        if (errs._form) {
          toast.error(errs._form.join(" "))
        } else {
          const list = Object.keys(errs).map(k => FIELD_LABELS[k] ?? k).join(", ")
          toast.error(list ? `Revisá: ${list}` : "Verifica los campos requeridos.")
        }
      } else if (res?.redirectTo) router.push(res.redirectTo)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {(properties.length === 0 || tenants.length === 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
          Antes de registrar el contrato necesitás:
          {properties.length === 0 && <> una <strong>propiedad</strong>;</>}
          {tenants.length === 0 && <> un <strong>inquilino</strong> (módulo Inquilinos);</>}
          {" "}sin eso no se puede guardar.
        </div>
      )}
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Partes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractNumber">N. de contrato *</Label>
            <Input id="contractNumber" name="contractNumber" defaultValue={suggestedNumber} required />
            {fieldErrors.contractNumber && <p className="text-xs text-destructive">{fieldErrors.contractNumber.join(", ")}</p>}
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="ACTIVE">Activo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Finca / Propiedad *</Label>
            <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); setParcelId("") }}>
              <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {availableParcels.length > 0 && (
            <div className="space-y-2">
              <Label>Predio (opcional)</Label>
              <Select value={parcelId || "__ALL__"} onValueChange={(v) => setParcelId(v === "__ALL__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Toda la finca</SelectItem>
                  {availableParcels.map((pc) => (
                    <SelectItem key={pc.id} value={pc.id}>
                      {pc.name || pc.cadastralNumber || "Predio"}
                      {pc.cadastralNumber && pc.name ? ` · ${pc.cadastralNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Si el contrato es solo de un predio, seleccionalo. Si es de toda la finca, dejá "Toda la finca".</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Inquilino *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Fechas y monto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de inicio *</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha de fin *</Label>
            <Input id="endDate" name="endDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlyRent">Renta mensual (Q) *</Label>
            <Input id="monthlyRent" name="monthlyRent" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deposit">Deposito en garantia (Q)</Label>
            <Input id="deposit" name="deposit" type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDueDay">Dia de pago *</Label>
            <Input id="paymentDueDay" name="paymentDueDay" type="number" min="1" max="31" defaultValue="5" required />
          </div>
          <div className="space-y-2">
            <Label>Frecuencia de pago</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_FREQUENCY).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lateFeePercent">Cargo por mora (%)</Label>
            <Input id="lateFeePercent" name="lateFeePercent" type="number" step="0.1" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annualIncrease">Incremento anual (%)</Label>
            <Input id="annualIncrease" name="annualIncrease" type="number" step="0.1" min="0" />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Notas</h3>
        <div className="space-y-2">
          <Label htmlFor="notes">Observaciones</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar contrato"}</Button>
      </div>
    </form>
  )
}
