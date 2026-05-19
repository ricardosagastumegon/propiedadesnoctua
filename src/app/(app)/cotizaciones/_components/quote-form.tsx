"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Tag } from "lucide-react"

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
  isFromProject,
}: {
  vendors: Vendor[]
  projects: Project[]
  partidas?: Partida[]
  action: (fd: FormData) => Promise<any>
  defaultVendorId?: string
  defaultProjectId?: string
  defaultPartidaId?: string
  isFromProject?: boolean
}) {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [vendorId, setVendorId] = useState(defaultVendorId ?? "")
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const [partidaId, setPartidaId] = useState(defaultPartidaId ?? "")
  const [ivaMode, setIvaMode] = useState<"included" | "separate">("included")
  const [total, setTotal] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [tax, setTax] = useState(0)
  const [error, setError] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  const lockedProject = isFromProject && defaultProjectId
    ? projects.find(p => p.id === defaultProjectId)
    : null
  const lockedPartida = isFromProject && defaultPartidaId
    ? partidas.find(p => p.id === defaultPartidaId)
    : null

  const finalSubtotal = ivaMode === "included" ? total : subtotal
  const finalTax = ivaMode === "included" ? 0 : tax
  const finalTotal = ivaMode === "included" ? total : subtotal + tax

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    fd.set("vendorId", vendorId)
    if (projectId) fd.set("projectId", projectId)
    if (partidaId) fd.set("partidaId", partidaId)
    fd.set("subtotal", finalSubtotal.toString())
    fd.set("taxAmount", finalTax.toString())
    fd.set("total", finalTotal.toString())
    const res = await action(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
    else if (res?.redirectTo) router.push(res.redirectTo)
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        {/* Locked project/partida context — shown instead of dropdowns */}
        {lockedProject && (
          <div className="rounded-lg bg-muted/60 border px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Proyecto</span>
              <span className="font-medium">{lockedProject.name}</span>
            </div>
            {lockedPartida && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Partida</span>
                <span className="font-medium">{lockedPartida.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Vendor */}
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

        {/* Project/Partida dropdowns — only shown when NOT locked */}
        {!lockedProject && (
          <>
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
          </>
        )}

        {/* Locked partida-only case (project visible but partida locked) */}
        {lockedProject && !lockedPartida && partidas.length > 0 && (
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
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Monto de la cotización</h3>
          {/* IVA mode toggle */}
          <div className="flex rounded-lg border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setIvaMode("included")}
              className={`px-3 py-1.5 transition-colors ${ivaMode === "included" ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              IVA incluido
            </button>
            <button
              type="button"
              onClick={() => setIvaMode("separate")}
              className={`px-3 py-1.5 transition-colors ${ivaMode === "separate" ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              + IVA separado
            </button>
          </div>
        </div>

        {ivaMode === "included" ? (
          <div className="space-y-1.5">
            <Label>Total de la cotización (Q) — IVA incluido</Label>
            <Input
              type="number" min="0" step="0.01" value={total || ""}
              placeholder="0.00"
              onChange={e => setTotal(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              El precio ya incluye IVA. Se registra como total sin desglose.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Subtotal (Q)</Label>
              <Input
                type="number" min="0" step="0.01" value={subtotal || ""}
                placeholder="0.00"
                onChange={e => setSubtotal(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>IVA (Q)</Label>
              <Input
                type="number" min="0" step="0.01" value={tax || ""}
                placeholder="0.00"
                onChange={e => setTax(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total (Q)</Label>
              <Input type="number" value={(subtotal + tax).toFixed(2)} readOnly className="bg-muted" />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Textarea name="notes" rows={3} placeholder="Condiciones, observaciones..." />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : (isFromProject ? "Agregar cotización" : "Crear cotizacion")}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
