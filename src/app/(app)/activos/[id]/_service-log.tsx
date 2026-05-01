"use client"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { createServiceLog, deleteServiceLog } from "../actions"
import { formatDate, formatGTQ } from "@/lib/format"
import { Plus, Trash2, Wrench } from "lucide-react"

interface Log {
  id: string
  serviceType: string
  date: Date
  cost: number
  performedBy: string | null
  nextServiceAt: Date | null
  notes: string | null
}

export function ServiceLogSection({ assetId, logs }: { assetId: string; logs: Log[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Record<string, string[]>>({})
  const ref = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    const res = await createServiceLog(assetId, fd)
    if (res?.error) { setError(res.error); setLoading(false) }
    else { setOpen(false); setLoading(false) }
  }

  async function handleDelete(id: string) {
    await deleteServiceLog(id, assetId)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">Registro de servicios</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-3 mr-1" />Registrar servicio
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Wrench className="size-8 mx-auto mb-2 opacity-30" />
          Sin registros de servicio.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{log.serviceType}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(log.date)} — {formatGTQ(log.cost)}</p>
                  {log.performedBy && <p className="text-xs text-muted-foreground">Por: {log.performedBy}</p>}
                  {log.nextServiceAt && (
                    <p className="text-xs text-muted-foreground">Proximo: {formatDate(log.nextServiceAt)}</p>
                  )}
                  {log.notes && <p className="text-xs mt-1">{log.notes}</p>}
                </div>
                <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => handleDelete(log.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar servicio</DialogTitle></DialogHeader>
          <form ref={ref} onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo de servicio *</Label>
              <Input name="serviceType" placeholder="Ej. Mantenimiento preventivo" />
              {error.serviceType && <p className="text-xs text-destructive">{error.serviceType[0]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label>Costo (Q) *</Label>
                <Input name="cost" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Realizado por</Label>
                <Input name="performedBy" placeholder="Nombre del tecnico" />
              </div>
              <div className="space-y-1.5">
                <Label>Proximo servicio</Label>
                <Input name="nextServiceAt" type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
