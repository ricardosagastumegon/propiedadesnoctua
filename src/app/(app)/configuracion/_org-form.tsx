"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { updateOrganization } from "./actions"

export function OrgForm({ org }: { org: { id: string; name: string; taxId: string | null; slug: string } }) {
  const ref = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<Record<string, string[]>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(ref.current!)
    const res = await updateOrganization(fd)
    setLoading(false)
    if (res?.error) setError(res.error)
    else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <form ref={ref} onSubmit={handleSubmit}>
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Datos de la organizacion</h3>
        <div className="space-y-1.5">
          <Label>Nombre de la organizacion *</Label>
          <Input name="name" defaultValue={org.name} />
          {error.name && <p className="text-xs text-destructive">{error.name[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>NIT / RTU</Label>
          <Input name="taxId" defaultValue={org.taxId ?? ""} placeholder="CF" />
        </div>
        <div className="space-y-1.5">
          <Label>Slug (URL)</Label>
          <Input value={org.slug} disabled className="bg-muted font-mono text-sm" />
        </div>
        <Button type="submit" disabled={loading}>
          {saved ? "Guardado" : loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </Card>
    </form>
  )
}
