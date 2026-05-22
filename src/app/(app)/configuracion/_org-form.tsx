"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { updateOrganization, updatePrepaymentCap } from "./actions"

export function OrgForm({ org, prepaymentCap }: { org: { id: string; name: string; taxId: string | null; slug: string }; prepaymentCap: number }) {
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
    if (res?.error) setError(typeof res.error === "string" ? { _form: [res.error] } : res.error)
    else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="space-y-4">
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

      <BusinessRulesCard initial={prepaymentCap} />
    </div>
  )
}

function BusinessRulesCard({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.set("prepaymentCapPercentage", value.toString())
    const res = await updatePrepaymentCap(fd)
    setLoading(false)
    if (res?.error) setError(res.error)
    else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-medium text-sm">Reglas de negocio</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configuración global para todos los proyectos y tickets.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Límite de prepago sin aceptación de servicio (%)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              max="100"
              value={value}
              onChange={e => setValue(parseInt(e.target.value) || 0)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Antes del pago final que cierra un compromiso al 100% con un proveedor, debe existir
            aceptación de servicio. Caja chica está exceptuada. <strong>Valor recomendado: 80%</strong>.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <Button type="submit" disabled={loading}>
          {saved ? "Guardado" : loading ? "Guardando..." : "Guardar regla"}
        </Button>
      </Card>
    </form>
  )
}
