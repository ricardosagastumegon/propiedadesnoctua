"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EMPLOYEE_STATUSES, PAY_PERIODS } from "@/lib/schemas/employee"

export function EmployeeForm({
  action,
  defaultValues,
}: {
  action: (fd: FormData) => Promise<any>
  defaultValues?: Record<string, any>
}) {
  const ref = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState(defaultValues?.status ?? "ACTIVE")
  const [payPeriod, setPayPeriod] = useState(defaultValues?.payPeriod ?? "MONTHLY")
  const [error, setError] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError({})
    const fd = new FormData(ref.current!)
    fd.set("status", status)
    fd.set("payPeriod", payPeriod)
    const res = await action(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
  }

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Datos personales</h3>
        <div className="space-y-1.5">
          <Label>Nombre completo *</Label>
          <Input name="fullName" defaultValue={defaultValues?.fullName} />
          {error.fullName && <p className="text-xs text-destructive">{error.fullName[0]}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>DPI / NIT *</Label>
            <Input name="documentNumber" defaultValue={defaultValues?.documentNumber} />
            {error.documentNumber && <p className="text-xs text-destructive">{error.documentNumber[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Puesto *</Label>
            <Input name="position" defaultValue={defaultValues?.position} placeholder="Ej. Jardinero" />
            {error.position && <p className="text-xs text-destructive">{error.position[0]}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYEE_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de ingreso *</Label>
            <Input name="hireDate" type="date" defaultValue={defaultValues?.hireDate?.split?.("T")[0]} />
            {error.hireDate && <p className="text-xs text-destructive">{error.hireDate[0]}</p>}
          </div>
        </div>
        {status !== "ACTIVE" && (
          <div className="space-y-1.5">
            <Label>Fecha de salida</Label>
            <Input name="terminationDate" type="date" defaultValue={defaultValues?.terminationDate?.split?.("T")[0]} />
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Contacto</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Telefono *</Label>
            <Input name="phone" defaultValue={defaultValues?.phone} placeholder="5555-1234" />
            {error.phone && <p className="text-xs text-destructive">{error.phone[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Correo electronico</Label>
            <Input name="email" type="email" defaultValue={defaultValues?.email} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Pago</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Periodo de pago</Label>
            <Select value={payPeriod} onValueChange={setPayPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAY_PERIODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Salario (Q) *</Label>
            <Input name="payRate" type="number" min="0" step="0.01" defaultValue={defaultValues?.payRate ?? "0"} />
            {error.payRate && <p className="text-xs text-destructive">{error.payRate[0]}</p>}
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-medium text-sm">Notas</h3>
        <Textarea name="notes" defaultValue={defaultValues?.notes} rows={3} />
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar empleado"}</Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
