"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Plus, Trash2, Upload } from "lucide-react"
import { createPoi, deletePoi, importPois } from "../actions"

export interface Poi {
  id: string; name: string; category: string | null; municipality: string | null
  latitude: number | null; longitude: number | null
}

export function PoiManager({ pois, canEdit }: { pois: Poi[]; canEdit: boolean }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [busy, setBusy] = useState(false)

  async function del(id: string) {
    if (!confirm("¿Eliminar este punto?")) return
    const res = await deletePoi(id)
    if ("error" in res) { alert(res.error); return }
    router.refresh()
  }

  const cats = Array.from(new Set(pois.map(p => p.category).filter(Boolean))) as string[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">{pois.length} puntos {cats.length > 0 && <>· {cats.join(", ")}</>}</div>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setImporting(v => !v); setAdding(false) }}><Upload className="size-3.5 mr-1" />Importar (pegar)</Button>
            <Button size="sm" onClick={() => { setAdding(v => !v); setImporting(false) }}><Plus className="size-3.5 mr-1" />Agregar punto</Button>
          </div>
        )}
      </div>

      {adding && <AddForm onDone={() => { setAdding(false); router.refresh() }} setBusy={setBusy} busy={busy} />}
      {importing && <ImportForm onDone={() => { setImporting(false); router.refresh() }} setBusy={setBusy} busy={busy} />}

      {pois.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Sin puntos de interés. Importá o agregá.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {pois.map(p => (
            <Card key={p.id} className="p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{[p.category, p.municipality].filter(Boolean).join(" · ") || "—"}</div>
                {p.latitude != null && (
                  <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 inline-flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3" /> ver
                  </a>
                )}
              </div>
              {canEdit && <button onClick={() => del(p.id)} className="text-destructive shrink-0"><Trash2 className="size-3.5" /></button>}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function AddForm({ onDone, busy, setBusy }: { onDone: () => void; busy: boolean; setBusy: (b: boolean) => void }) {
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const res = await createPoi(new FormData(e.currentTarget))
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    onDone()
  }
  return (
    <Card className="p-4">
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Nombre *</Label><Input name="name" required placeholder="Ej: Gasolinera Puma z10" /></div>
        <div className="space-y-1"><Label className="text-xs">Categoría</Label><Input name="category" placeholder="gasolinera / competencia" /></div>
        <div className="space-y-1"><Label className="text-xs">Municipio</Label><Input name="municipality" /></div>
        <div className="space-y-1"><Label className="text-xs">Latitud</Label><Input name="latitude" type="number" step="any" placeholder="14.58" /></div>
        <div className="space-y-1"><Label className="text-xs">Longitud</Label><Input name="longitude" type="number" step="any" placeholder="-90.52" /></div>
        <div className="flex items-end"><Button type="submit" size="sm" disabled={busy} className="w-full">{busy ? "…" : "Guardar"}</Button></div>
      </form>
    </Card>
  )
}

function ImportForm({ onDone, busy, setBusy }: { onDone: () => void; busy: boolean; setBusy: (b: boolean) => void }) {
  const [text, setText] = useState("")
  const [category, setCategory] = useState("gasolinera")
  async function run() {
    setBusy(true)
    const res = await importPois(text, category)
    setBusy(false)
    if ("error" in res) { alert(res.error); return }
    alert(`${res.count} puntos importados.`)
    onDone()
  }
  return (
    <Card className="p-4 space-y-2">
      <div className="text-xs text-muted-foreground">Pegá filas del Excel/Sheets. Cada línea debe traer <strong>latitud y longitud</strong> (ej. <code>14.5803, -90.5221 Guatemala</code>). Lo demás se toma como nombre/municipio.</div>
      <div className="flex items-center gap-2">
        <Label className="text-xs">Categoría</Label>
        <Input value={category} onChange={e => setCategory(e.target.value)} className="h-8 w-40" />
      </div>
      <Textarea rows={5} value={text} onChange={e => setText(e.target.value)} placeholder="14.58035, -90.52215 GUATEMALA&#10;14.58532, -90.48817 GUATEMALA" className="font-mono text-xs" />
      <div className="flex justify-end"><Button size="sm" onClick={run} disabled={busy || !text.trim()}>{busy ? "Importando…" : "Importar"}</Button></div>
    </Card>
  )
}
