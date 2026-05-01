"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Vendor { id: string; name: string }
interface Project { id: string; name: string }
interface Partida { id: string; name: string }

export function QuoteForm({
  vendors,
  projects,
  partidas = [],
  action,
  defaultVendorId,
  defaultProjectId,
  defaultPartidaId,
}: {
  vendors: Vendor[]
  projects: Project[]
  partidas?: Partida[]
  action: (fd: FormData) => Promise<any>
  defaultVendorId?: string
  defaultProjectId?: string
  defaultPartidaId?: string
}) {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [vendorId, setVendorId] = useState(defaultVendorId ?? "")
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const [partidaId, setPartidaId] = useState(defaultPartidaId ?? "")
  const [subtotal, setSubtotal] = useState(0)
  const [tax, setTax] = useState(0)
  const [error, setError] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    fd.set("vendorId", vendorId)
    if (projectId) fd.set("projectId", projectId)
    if (partidaId) fd.set("partidaId", partidaId)
    fd.set("subtotal", subtotal.toString())
    fd.set("taxAmount", tax.toString())
    fd.set("total", (subtotal + tax).toString())
    const res = await action(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
    else if (res?.redirectTo) router.push(res.redirectTo)
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Proveedor *</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger><SelectValue placeholder="Selecciona un proveedor" /></SelectTrigger>
            <SelectContent>
              {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {error.vendorId && <p className="text-xs text-destructive">{error.vendorId[0]}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Proyecto (opcional)</Label>
          <Select value={projectId} onValueChange={v => { setProjectId(v); setPartidaId("") }}>
            <SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {(projectId && partidas.length > 0) && (
          <div className="space-y-1.5">
            <Label>Partida (opcional)</Label>
            <Select value={partidaId} onValueChange={setPartidaId}>
              <SelectTrigger><SelectValue placeholder="Sin partida especifica" /></SelectTrigger>
              <SelectContent>
                {partidas.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fecha *</Label>
            <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
          </div>
          <div className="space-y-1.5">
            <Label>Valida hasta</Label>
            <Input name="validUntil" type="date" />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Montos</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Subtotal (Q)</Label>
            <Input
              type="number" min="0" step="0.01" value={subtotal}
              onChange={e => setSubtotal(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>IVA (Q)</Label>
            <Input
              type="number" min="0" step="0.01" value={tax}
              onChange={e => setTax(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Total (Q)</Label>
            <Input type="number" value={(subtotal + tax).toFixed(2)} readOnly className="bg-muted" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Textarea name="notes" rows={3} placeholder="Condiciones, observaciones..." />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear cotizacion"}</Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
