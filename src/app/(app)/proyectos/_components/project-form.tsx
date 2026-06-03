"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROJECT_TYPES, PROJECT_STATUSES } from "@/lib/schemas/project"

interface Property { id: string; name: string }

export function ProjectForm({
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
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [type, setType] = useState(defaultValues?.type ?? "RENOVATION")
  const [status, setStatus] = useState(defaultValues?.status ?? "PLANNING")
  const [propertyId, setPropertyId] = useState(defaultValues?.propertyId ?? defaultPropertyId ?? "")
  const [error, setError] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    fd.set("type", type)
    fd.set("status", status)
    if (propertyId) fd.set("propertyId", propertyId)
    const res = await action(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
    else if (res?.redirectTo) router.push(res.redirectTo)
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nombre *</Label>
          <Input name="name" defaultValue={defaultValues?.name} placeholder="Ej. Remodelacion cocina" />
          {error.name && <p className="text-xs text-destructive">{error.name[0]}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Descripcion</Label>
          <Textarea name="description" defaultValue={defaultValues?.description} rows={3} />
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
        <h3 className="font-medium text-sm">Fechas y avance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fecha inicio</Label>
            <Input name="startDate" type="date" defaultValue={defaultValues?.startDate?.split?.("T")[0]} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha objetivo</Label>
            <Input name="endDate" type="date" defaultValue={defaultValues?.endDate?.split?.("T")[0]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Avance (%)</Label>
            <Input name="progressPercent" type="number" min="0" max="100" defaultValue={defaultValues?.progressPercent ?? "0"} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Notas</h3>
        <Textarea name="notes" defaultValue={defaultValues?.notes} rows={3} />
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar proyecto"}</Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
