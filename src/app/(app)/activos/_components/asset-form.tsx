"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ASSET_CATEGORIES, ASSET_STATUSES } from "@/lib/schemas/asset"

interface Property { id: string; name: string }

export function AssetForm({
  properties,
  action,
  defaultValues,
  defaultPropertyId,
}: {
  properties: Property[]
  action: (fd: FormData) => Promise<any>
  defaultValues?: Record<string, any>
  defaultPropertyId?: string
}) {
  const ref = useRef<HTMLFormElement>(null)
  const [category, setCategory] = useState(defaultValues?.category ?? "OTHER")
  const [status, setStatus] = useState(defaultValues?.status ?? "ACTIVE")
  const [propertyId, setPropertyId] = useState(defaultValues?.propertyId ?? defaultPropertyId ?? "")
  const [error, setError] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    fd.set("category", category)
    fd.set("status", status)
    if (propertyId) fd.set("propertyId", propertyId)
    const res = await action(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Informacion general</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nombre *</Label>
          <Input name="name" defaultValue={defaultValues?.name} placeholder="Ej. Aire acondicionado sala" />
          {error.name && <p className="text-xs text-destructive">{error.name[0]}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Marca</Label>
            <Input name="brand" defaultValue={defaultValues?.brand} placeholder="Ej. LG" />
          </div>
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Input name="model" defaultValue={defaultValues?.model} placeholder="Ej. LW1216HR" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Numero de serie</Label>
            <Input name="serialNumber" defaultValue={defaultValues?.serialNumber} />
          </div>
          <div className="space-y-1.5">
            <Label>Ubicacion</Label>
            <Input name="location" defaultValue={defaultValues?.location} placeholder="Ej. Sala principal" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Propiedad</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger><SelectValue placeholder="Sin propiedad asignada" /></SelectTrigger>
            <SelectContent>
              {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Datos financieros</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fecha de compra</Label>
            <Input name="purchaseDate" type="date" defaultValue={defaultValues?.purchaseDate?.split?.("T")[0]} />
          </div>
          <div className="space-y-1.5">
            <Label>Costo de compra (Q)</Label>
            <Input name="purchaseCost" type="number" min="0" step="0.01" defaultValue={defaultValues?.purchaseCost} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valor actual (Q)</Label>
            <Input name="currentValue" type="number" min="0" step="0.01" defaultValue={defaultValues?.currentValue} />
          </div>
          <div className="space-y-1.5">
            <Label>Garantia hasta</Label>
            <Input name="warranty" type="date" defaultValue={defaultValues?.warranty?.split?.("T")[0]} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Notas</h3>
        <Textarea name="notes" defaultValue={defaultValues?.notes} rows={3} placeholder="Observaciones adicionales..." />
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar activo"}</Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
