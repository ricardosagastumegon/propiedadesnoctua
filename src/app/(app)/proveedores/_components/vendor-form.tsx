"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VENDOR_CATEGORIES } from "@/lib/schemas/vendor"

export function VendorForm({
  action,
  defaultValues,
}: {
  action: (fd: FormData) => Promise<any>
  defaultValues?: Record<string, any>
}) {
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  const [category, setCategory] = useState(defaultValues?.category ?? "OTHER")
  const [type, setType] = useState(defaultValues?.type ?? "COMPANY")
  const [error, setError] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    fd.set("category", category)
    fd.set("type", type)
    const res = await action(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
    else if (res?.redirectTo) router.push(res.redirectTo)
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Datos del proveedor</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VENDOR_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY">Empresa</SelectItem>
                <SelectItem value="INDIVIDUAL">Persona individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nombre / Razon social *</Label>
          <Input name="name" defaultValue={defaultValues?.name} />
          {error.name && <p className="text-xs text-destructive">{error.name[0]}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>NIT / RTU</Label>
            <Input name="taxId" defaultValue={defaultValues?.taxId} placeholder="CF o NIT" />
          </div>
          <div className="space-y-1.5">
            <Label>Calificacion (1-5)</Label>
            <Input name="rating" type="number" min="1" max="5" step="0.5" defaultValue={defaultValues?.rating} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Contacto</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre de contacto</Label>
            <Input name="contactName" defaultValue={defaultValues?.contactName} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefono *</Label>
            <Input name="phone" defaultValue={defaultValues?.phone} placeholder="5555-1234" />
            {error.phone && <p className="text-xs text-destructive">{error.phone[0]}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Correo electronico</Label>
          <Input name="email" type="email" defaultValue={defaultValues?.email} />
          {error.email && <p className="text-xs text-destructive">{error.email[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Direccion</Label>
          <Textarea name="address" defaultValue={defaultValues?.address} rows={2} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Notas</h3>
        <Textarea name="notes" defaultValue={defaultValues?.notes} rows={3} />
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar proveedor"}</Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
