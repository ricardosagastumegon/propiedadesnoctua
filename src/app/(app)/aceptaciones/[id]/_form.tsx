"use client"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Star, X, Camera, CheckCircle2 } from "lucide-react"
import { acceptServiceAction, rejectServiceAction } from "../actions"
import { ACCEPTANCE_CHECKLIST_ITEMS } from "@/lib/service-acceptance"

const CHECKLIST = ACCEPTANCE_CHECKLIST_ITEMS

interface PhotoEntry { url: string; caption: string }

export function AcceptForm({ acceptanceId }: { acceptanceId: string }) {
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST.map(c => [c.key, false])),
  )
  const [rating, setRating] = useState<number>(0)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [photoCap, setPhotoCap] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const rejectRef = useRef<HTMLFormElement>(null)

  const allChecked = CHECKLIST.every(c => checks[c.key])
  const canSubmit = allChecked && rating > 0 && photos.length >= 1

  function addPhoto() {
    if (!photoUrl.trim()) return
    setPhotos(p => [...p, { url: photoUrl.trim(), caption: photoCap.trim() }])
    setPhotoUrl("")
    setPhotoCap("")
  }

  async function handleAccept() {
    if (!canSubmit) { setError("Completa el checklist, califica y agrega al menos una foto"); return }
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.set("acceptanceId", acceptanceId)
    fd.set("rating", rating.toString())
    fd.set("notes", notes)
    fd.set("checklist", JSON.stringify(CHECKLIST.map(c => ({ key: c.key, checked: !!checks[c.key] }))))
    fd.set("photos", JSON.stringify(photos))
    const res = await acceptServiceAction(fd)
    setLoading(false)
    if (res?.error) setError(res.error)
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(rejectRef.current!)
    fd.set("acceptanceId", acceptanceId)
    const res = await rejectServiceAction(fd)
    setLoading(false)
    if (res?.error) setError(res.error)
    else setRejectOpen(false)
  }

  return (
    <>
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Checklist de inspección</h3>
        <div className="space-y-2">
          {CHECKLIST.map(c => (
            <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-muted/50">
              <input
                type="checkbox"
                checked={!!checks[c.key]}
                onChange={e => setChecks(s => ({ ...s, [c.key]: e.target.checked }))}
                className="rounded"
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2">Calificación del proveedor</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="hover:scale-110 transition-transform"
              >
                <Star className={`size-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <p className="text-sm font-medium flex items-center gap-2"><Camera className="size-4" /> Evidencia fotográfica (mínimo 1)</p>
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">URL / nombre de archivo</Label>
              <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="foto-1.jpg o https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nota</Label>
              <Input value={photoCap} onChange={e => setPhotoCap(e.target.value)} placeholder="opcional" />
            </div>
          </div>
          <Button size="sm" type="button" variant="outline" onClick={addPhoto} disabled={!photoUrl.trim()}>
            + Agregar foto
          </Button>
          {photos.length > 0 && (
            <div className="space-y-1 pt-2">
              {photos.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                  <span className="truncate">{p.url}{p.caption && ` — ${p.caption}`}</span>
                  <button type="button" onClick={() => setPhotos(arr => arr.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notas (opcional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones, recomendaciones..." />
        </div>

        <div className="pt-2 border-t bg-muted/30 -mx-6 -mb-6 px-6 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Al aceptar, certifico bajo mi responsabilidad que verifiqué el servicio según el checklist y autorizo el pago final.
            Esta acción genera un acta firmada con hash de verificación que servirá como prueba irrefutable.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" type="button" onClick={() => setRejectOpen(true)} disabled={loading}>
              Rechazar
            </Button>
            <Button size="sm" type="button" onClick={handleAccept} disabled={loading || !canSubmit}>
              <CheckCircle2 className="size-3.5 mr-1" />
              {loading ? "Procesando..." : "Aceptar servicio"}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar aceptación</DialogTitle></DialogHeader>
          <form ref={rejectRef} onSubmit={handleReject} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Razón del rechazo *</Label>
              <Input name="rejectionReason" required placeholder="¿Por qué no procede la aceptación?" />
            </div>
            <div className="space-y-1.5">
              <Label>Correcciones requeridas</Label>
              <Input name="requiredCorrections" placeholder="Qué debe corregir el proveedor antes de re-solicitar" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Procesando..." : "Confirmar rechazo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
