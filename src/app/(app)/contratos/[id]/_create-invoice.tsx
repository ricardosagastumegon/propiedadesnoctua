"use client"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { createInvoice } from "../actions"

export function CreateInvoiceDialog({ contractId, monthlyRent }: { contractId: string; monthlyRent: number }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("contractId", contractId)
    startTransition(async () => {
      await createInvoice(fd)
      toast.success("Factura creada.")
      setOpen(false)
    })
  }

  const today = new Date()
  const dueDate = new Date(today.getFullYear(), today.getMonth(), 5)
  if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Generar factura</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Generar factura</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issueDate">Fecha de emision *</Label>
            <Input id="issueDate" name="issueDate" type="date" defaultValue={today.toISOString().split("T")[0]} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Fecha de vencimiento *</Label>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={dueDate.toISOString().split("T")[0]} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto (Q) *</Label>
            <Input id="amount" name="amount" type="number" step="0.01" defaultValue={monthlyRent} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Descripcion</Label>
            <Input id="notes" name="notes" defaultValue="Renta mensual" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creando..." : "Crear factura"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
