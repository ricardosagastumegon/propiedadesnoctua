"use client"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { registerPayment } from "../actions"
import type { Invoice } from "@prisma/client"

const METHODS = ["Efectivo", "Transferencia", "Cheque", "Deposito", "Tarjeta"]

export function RegisterPaymentDialog({ contractId, invoices }: { contractId: string; invoices: Invoice[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [method, setMethod] = useState("Transferencia")
  const [invoiceId, setInvoiceId] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("contractId", contractId)
    fd.set("method", method)
    if (invoiceId) fd.set("invoiceId", invoiceId)
    startTransition(async () => {
      await registerPayment(fd)
      toast.success("Pago registrado.")
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Registrar pago</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Fecha de pago *</Label>
            <Input id="paymentDate" name="paymentDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto (Q) *</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-2">
            <Label>Metodo de pago</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {invoices.length > 0 && (
            <div className="space-y-2">
              <Label>Aplicar a factura (opcional)</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger><SelectValue placeholder="Sin aplicar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin aplicar</SelectItem>
                  {invoices.filter(i => i.status !== "PAID").map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.number} — Q{inv.balance.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reference">Referencia / No. cheque</Label>
            <Input id="reference" name="reference" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Input id="notes" name="notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Registrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
