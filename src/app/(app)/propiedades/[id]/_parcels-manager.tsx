"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { CoordPicker } from "../_components/coord-picker"
import { createParcel, updateParcel, deleteParcel } from "../parcels-actions"
import { Plus, MapPin, Pencil, Trash2, Layers } from "lucide-react"

export interface ParcelRow {
  id: string
  name: string | null
  cadastralNumber: string | null
  areaHectares: number | null
  notes: string | null
  mapPolygon: unknown
}

interface Props {
  propertyId: string
  parcels: ParcelRow[]
  canEdit: boolean
}

export function ParcelsManager({ propertyId, parcels, canEdit }: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const totalHa = parcels.reduce((s, p) => s + (p.areaHectares ?? 0), 0)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Layers className="size-4" />
          Predios / Catastros ({parcels.length})
        </h3>
        {canEdit && !adding && (
          <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditingId(null) }}>
            <Plus className="size-3.5 mr-1" />Agregar predio
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Una finca puede tener varios predios catastrales, cada uno con su número de catastro y su contorno.
        {totalHa > 0 && <> Área total: <strong>{totalHa.toFixed(2)} ha</strong>.</>}
      </p>

      {adding && (
        <ParcelForm
          propertyId={propertyId}
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {parcels.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Sin predios registrados. {canEdit && "Agregá uno para mapear el contorno de la finca."}
        </p>
      ) : (
        <div className="space-y-2 mt-2">
          {parcels.map(p => (
            <div key={p.id} className="border rounded-lg">
              <div className="flex items-center justify-between p-3 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{p.name || p.cadastralNumber || "Predio"}</span>
                    {p.cadastralNumber && p.name && (
                      <span className="text-xs text-muted-foreground font-mono">{p.cadastralNumber}</span>
                    )}
                    {p.mapPolygon ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">con contorno</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">sin contorno</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.areaHectares != null ? `${p.areaHectares.toFixed(2)} ha` : "área sin calcular"}
                    {p.notes && <> · {p.notes}</>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { setEditingId(editingId === p.id ? null : p.id); setAdding(false) }}>
                      <Pencil className="size-3 mr-1" />{editingId === p.id ? "Cerrar" : "Editar"}
                    </Button>
                    <DeleteParcelButton parcelId={p.id} />
                  </div>
                )}
              </div>
              {editingId === p.id && (
                <div className="border-t p-3">
                  <ParcelForm
                    propertyId={propertyId}
                    parcel={p}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function ParcelForm({
  propertyId, parcel, onDone, onCancel,
}: {
  propertyId: string
  parcel?: ParcelRow
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(ref.current!)
    const res = parcel
      ? await updateParcel(parcel.id, fd)
      : await createParcel(propertyId, fd)
    setLoading(false)
    if (res?.error) { setError(res.error); return }
    router.refresh()
    onDone()
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-4 bg-muted/20 p-4 rounded-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pname" className="text-sm">Nombre del predio</Label>
          <Input id="pname" name="name" defaultValue={parcel?.name ?? ""} placeholder="Ej: Predio norte / Lote 2" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pcad" className="text-sm">Número de catastro (RIC)</Label>
          <Input id="pcad" name="cadastralNumber" defaultValue={parcel?.cadastralNumber ?? ""} placeholder="18-03-06-00001" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pnotes" className="text-sm">Notas</Label>
        <Textarea id="pnotes" name="notes" rows={2} defaultValue={parcel?.notes ?? ""} placeholder="Opcional" />
      </div>

      <div className="pt-2 border-t">
        <Label className="text-sm flex items-center gap-1.5 mb-2"><MapPin className="size-3.5" /> Contorno del predio</Label>
        <CoordPicker initialPolygon={parcel?.mapPolygon} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Guardando…" : parcel ? "Guardar predio" : "Agregar predio"}
        </Button>
      </div>
    </form>
  )
}

function DeleteParcelButton({ parcelId }: { parcelId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function handleDelete() {
    if (!confirm("¿Eliminar este predio? Esta acción no se puede deshacer.")) return
    setLoading(true)
    const res = await deleteParcel(parcelId)
    setLoading(false)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }
  return (
    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={handleDelete} disabled={loading}>
      <Trash2 className="size-3" />
    </Button>
  )
}
