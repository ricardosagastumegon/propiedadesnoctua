"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { replenishPettyCash } from "../actions"

export function ReplenishForm({ propertyId }: { propertyId: string }) {
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg("")
    const fd = new FormData(ref.current!)
    const res = await replenishPettyCash(propertyId, fd)
    setLoading(false)
    if (res?.error) setMsg(res.error)
    else if (res?.pending) setMsg("Solicitud enviada a autorizaciones.")
    else { setMsg("Reposicion registrada."); ref.current?.reset() }
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Monto (Q) *</Label>
          <Input name="amount" type="number" min="1" step="0.01" placeholder="0.00" required />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Notas</Label>
          <Textarea name="notes" rows={2} placeholder="Motivo de la reposicion..." />
        </div>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <Button type="submit" size="sm" variant="outline" disabled={loading}>
        {loading ? "Enviando..." : "Solicitar reposicion"}
      </Button>
    </form>
  )
}
