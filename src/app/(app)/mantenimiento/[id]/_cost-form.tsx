"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { updateTicketCost } from "../actions"

export function CostForm({
  ticketId,
  estimatedCost,
  actualCost,
  resolutionNotes,
}: {
  ticketId: string
  estimatedCost: number | null
  actualCost: number | null
  resolutionNotes: string | null
}) {
  const [cost, setCost] = useState(actualCost?.toString() ?? "")
  const [notes, setNotes] = useState(resolutionNotes ?? "")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    await updateTicketCost(ticketId, parseFloat(cost) || 0, notes)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-medium text-sm">Resolución y costos</h3>
      <div className="space-y-1.5">
        <Label>Costo real (Q)</Label>
        <Input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
      </div>
      <div className="space-y-1.5">
        <Label>Notas de resolución</Label>
        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe cómo se resolvió el problema..." />
      </div>
      <Button size="sm" onClick={handleSave} disabled={loading}>
        {saved ? "Guardado" : loading ? "Guardando..." : "Guardar"}
      </Button>
    </Card>
  )
}
