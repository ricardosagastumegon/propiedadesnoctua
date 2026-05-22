"use client"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { addProjectCost, deleteProjectCost } from "../actions"
import { formatDate, formatGTQ } from "@/lib/format"
import { COST_TYPES } from "@/lib/schemas/project"
import { Plus, Trash2 } from "lucide-react"

interface Cost {
  id: string
  type: string
  description: string
  amount: number
  date: Date
  notes: string | null
}

export function CostList({ projectId, costs }: { projectId: string; costs: Cost[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState("MATERIAL")
  const [error, setError] = useState<Record<string, string[]>>({})
  const ref = useRef<HTMLFormElement>(null)

  const total = costs.reduce((s, c) => s + c.amount, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(ref.current!)
    fd.set("type", type)
    const res = await addProjectCost(projectId, fd)
    if (res?.error) {
      setError(typeof res.error === "string" ? { _form: [res.error] } : res.error)
      setLoading(false)
    }
    else { setOpen(false); setLoading(false); setError({}) }
  }

  async function handleDelete(costId: string) {
    await deleteProjectCost(costId, projectId)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">Costos — Total: {formatGTQ(total)}</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-3 mr-1" />Agregar costo
        </Button>
      </div>

      {costs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin costos registrados.</p>
      ) : (
        <div className="space-y-2">
          {costs.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-3 border rounded-lg p-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{COST_TYPES[c.type]}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(c.date)}</span>
                </div>
                <p className="text-sm">{c.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium text-sm">{formatGTQ(c.amount)}</span>
                <Button size="icon" variant="ghost" className="size-7 opacity-0 group-hover:opacity-100"
                  onClick={() => handleDelete(c.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar costo</DialogTitle></DialogHeader>
          <form ref={ref} onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COST_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripcion *</Label>
              <Input name="description" placeholder="Ej. Pintura, mano de obra..." />
              {error.description && <p className="text-xs text-destructive">{error.description[0]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto (Q) *</Label>
                <Input name="amount" type="number" min="0" step="0.01" defaultValue="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Agregar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
