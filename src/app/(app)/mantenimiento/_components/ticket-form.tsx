"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORIES, PRIORITIES } from "@/lib/schemas/maintenance"

interface Property { id: string; name: string }

export function TicketForm({
  properties,
  defaultPropertyId,
  action,
  defaultValues,
}: {
  properties: Property[]
  defaultPropertyId?: string
  action: (fd: FormData) => Promise<any>
  defaultValues?: Record<string, any>
}) {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [propertyId, setPropertyId] = useState(defaultValues?.propertyId ?? defaultPropertyId ?? "")
  const [category, setCategory] = useState(defaultValues?.category ?? "OTHER")
  const [priority, setPriority] = useState(defaultValues?.priority ?? "MEDIUM")
  const [error, setError] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    fd.set("propertyId", propertyId)
    fd.set("category", category)
    fd.set("priority", priority)
    const res = await action(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
    else if (res?.redirectTo) router.push(res.redirectTo)
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Propiedad *</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger><SelectValue placeholder="Selecciona una propiedad" /></SelectTrigger>
            <SelectContent>
              {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {error.propertyId && <p className="text-xs text-destructive">{error.propertyId[0]}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioridad</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input name="title" defaultValue={defaultValues?.title} placeholder="Ej. Fuga en tubo principal" />
          {error.title && <p className="text-xs text-destructive">{error.title[0]}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Descripción *</Label>
          <Textarea name="description" defaultValue={defaultValues?.description} rows={4} placeholder="Describe el problema con detalle..." />
          {error.description && <p className="text-xs text-destructive">{error.description[0]}</p>}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Reportado por (opcional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input name="reportedBy" defaultValue={defaultValues?.reportedBy} placeholder="Nombre del inquilino o contacto" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input name="reportedPhone" defaultValue={defaultValues?.reportedPhone} placeholder="5555-1234" />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Costo estimado (opcional)</h3>
        <div className="space-y-1.5">
          <Label>Costo estimado (Q)</Label>
          <Input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={defaultValues?.estimatedCost} placeholder="0.00" />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear ticket"}</Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
