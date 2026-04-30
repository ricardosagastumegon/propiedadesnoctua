"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { DOCUMENT_TYPES, TENANT_TYPES } from "@/lib/schemas/tenant"
import type { Tenant } from "@prisma/client"

interface Props {
  tenant?: Tenant
  action: (fd: FormData) => Promise<any>
  submitLabel?: string
}

export function TenantForm({ tenant, action, submitLabel = "Guardar" }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState(tenant?.type ?? "INDIVIDUAL")
  const [docType, setDocType] = useState(tenant?.documentType ?? "DPI")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    fd.set("type", type)
    fd.set("documentType", docType)
    startTransition(async () => {
      const res = await action(fd)
      if (res?.error) toast.error("Verifica los campos e intenta de nuevo.")
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Datos personales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de inquilino</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TENANT_TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo *</Label>
            <Input id="fullName" name="fullName" defaultValue={tenant?.fullName} required />
          </div>
          <div className="space-y-2">
            <Label>Tipo de documento *</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DOCUMENT_TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="documentNumber">Numero de documento *</Label>
            <Input id="documentNumber" name="documentNumber" defaultValue={tenant?.documentNumber} required />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Contacto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono principal *</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={tenant?.phone} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alternatePhone">Telefono alterno</Label>
            <Input id="alternatePhone" name="alternatePhone" type="tel" defaultValue={tenant?.alternatePhone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input id="email" name="email" type="email" defaultValue={tenant?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occupation">Ocupacion</Label>
            <Input id="occupation" name="occupation" defaultValue={tenant?.occupation ?? ""} />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-display text-base">Contacto de emergencia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyContact">Nombre</Label>
            <Input id="emergencyContact" name="emergencyContact" defaultValue={tenant?.emergencyContact ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">Telefono</Label>
            <Input id="emergencyPhone" name="emergencyPhone" defaultValue={tenant?.emergencyPhone ?? ""} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" defaultValue={tenant?.notes ?? ""} rows={3} />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : submitLabel}</Button>
      </div>
    </form>
  )
}
