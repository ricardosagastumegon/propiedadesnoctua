"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerExpense } from "../actions"

const CATEGORIES = ["Materiales", "Limpieza", "Electricidad", "Plomeria", "Jardineria", "Seguridad", "Varios"]

export function ExpenseForm({ propertyId }: { propertyId: string }) {
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [category, setCategory] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const fd = new FormData(ref.current!)
    if (category) fd.set("category", category)
    const res = await registerExpense(propertyId, fd)
    setLoading(false)
    if (res?.error) setError(res.error)
    else ref.current?.reset()
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Descripcion *</Label>
          <Input name="description" placeholder="Materiales, limpieza..." required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Monto (Q) *</Label>
          <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha *</Label>
          <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Categoria</Label>
          <Select onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Referencia</Label>
          <Input name="reference" placeholder="No. factura, recibo..." />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Registrando..." : "Registrar gasto"}
      </Button>
    </form>
  )
}
