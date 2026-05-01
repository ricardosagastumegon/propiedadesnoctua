"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate, formatGTQ } from "@/lib/format"
import { VENDOR_INVOICE_STATUSES, VENDOR_INVOICE_STATUS_COLORS } from "@/lib/schemas/authorization"
import { createVendorInvoice, updateVendorInvoiceStatus, deleteVendorInvoice } from "../actions"
import { Plus, Trash2 } from "lucide-react"

interface VendorInvoice {
  id: string
  invoiceNumber: string
  date: Date
  dueDate: Date | null
  total: number
  balance: number
  status: string
  notes: string | null
}

interface Props {
  vendorId: string
  invoices: VendorInvoice[]
}

export function VendorInvoices({ vendorId, invoices }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const totalPending = invoices.filter(i => i.status !== "PAID" && i.status !== "REJECTED").reduce((s, i) => s + i.balance, 0)

  return (
    <div className="space-y-4">
      {invoices.length > 0 && (
        <div className="flex items-center justify-between text-sm border rounded-lg p-3 bg-muted/30">
          <span className="text-muted-foreground">Saldo pendiente</span>
          <span className="font-medium tabular-nums">{formatGTQ(totalPending)}</span>
        </div>
      )}

      {invoices.map(inv => (
        <Card key={inv.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium font-mono">{inv.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.date)}{inv.dueDate ? ` — Vence: ${formatDate(inv.dueDate)}` : ""}</p>
              {inv.notes && <p className="text-xs text-muted-foreground mt-1">{inv.notes}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium">{formatGTQ(inv.total)}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${VENDOR_INVOICE_STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                {VENDOR_INVOICE_STATUSES[inv.status] ?? inv.status}
              </span>
            </div>
          </div>
          {(inv.status === "PENDING" || inv.status === "APPROVED") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              {inv.status === "PENDING" && (
                <Button size="sm" variant="outline" disabled={loading}
                  onClick={() => updateVendorInvoiceStatus(inv.id, "APPROVED", vendorId)}>
                  Aprobar
                </Button>
              )}
              {inv.status === "APPROVED" && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}
                  onClick={() => updateVendorInvoiceStatus(inv.id, "PAID", vendorId)}>
                  Marcar pagada
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto"
                onClick={() => deleteVendorInvoice(inv.id, vendorId)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </Card>
      ))}

      {showForm ? (
        <Card className="p-4">
          <form action={async (fd) => {
            setLoading(true)
            await createVendorInvoice(vendorId, fd)
            setShowForm(false)
            setLoading(false)
          }} className="space-y-3">
            <p className="text-sm font-medium">Nueva factura de proveedor</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">No. Factura *</label>
                <input name="invoiceNumber" required placeholder="FAC-001"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fecha *</label>
                <input name="date" type="date" required
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fecha vencimiento</label>
                <input name="dueDate" type="date"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Subtotal (Q) *</label>
                <input name="subtotal" type="number" step="0.01" min="0" required
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">IVA (Q)</label>
                <input name="taxAmount" type="number" step="0.01" min="0" defaultValue="0"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notas</label>
                <input name="notes" placeholder="Opcional"
                  className="w-full border rounded px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>Guardar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-4 mr-1.5" />Registrar factura
        </Button>
      )}
    </div>
  )
}
