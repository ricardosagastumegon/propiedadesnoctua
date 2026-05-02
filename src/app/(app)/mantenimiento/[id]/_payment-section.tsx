"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PaymentForm, type PaymentFormData } from "@/components/shared/payment-form"
import { addTicketPayment } from "../actions"
import { formatGTQ, formatDate } from "@/lib/format"
import { Plus } from "lucide-react"

const METHODS: Record<string, string> = {
  CAJA_CHICA: "Caja Chica",
  TRANSFER: "Transferencia",
  CASH: "Efectivo",
  REIMBURSEMENT: "Reembolso",
}

interface Payment {
  id: string
  amount: number
  method: string
  date: Date
  reference: string | null
  percentageOfTotal: number | null
  closesWithDiscount: boolean
  discountAmount: number | null
}

export function PaymentSection({ ticketId, payments, totalAmount }: {
  ticketId: string
  payments: Payment[]
  totalAmount: number | null
}) {
  const [showForm, setShowForm] = useState(false)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  async function handleSubmit(data: PaymentFormData) {
    const fd = new FormData()
    fd.set("amount", data.amount.toString())
    fd.set("method", data.method)
    fd.set("date", data.date)
    if (data.reference) fd.set("reference", data.reference)
    if (data.notes) fd.set("notes", data.notes)
    if (data.percentageOfTotal != null) fd.set("percentageOfTotal", data.percentageOfTotal.toString())
    fd.set("closesWithDiscount", data.closesWithDiscount.toString())
    if (data.discountAmount != null) fd.set("discountAmount", data.discountAmount.toString())
    if (data.discountReason) fd.set("discountReason", data.discountReason)
    const res = await addTicketPayment(ticketId, fd)
    if (!res?.error) setShowForm(false)
    return res
  }

  return (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
      ) : (
        <div className="space-y-1">
          {payments.map(p => (
            <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
              <div>
                <span className="font-medium tabular-nums">{formatGTQ(p.amount)}</span>
                <span className="text-muted-foreground ml-2">{METHODS[p.method] ?? p.method}</span>
                {p.percentageOfTotal != null && (
                  <span className="text-muted-foreground ml-2 text-xs">({p.percentageOfTotal}%)</span>
                )}
                {p.closesWithDiscount && p.discountAmount && (
                  <span className="text-xs ml-2 text-amber-600">desc. {formatGTQ(p.discountAmount)}</span>
                )}
                {p.reference && <span className="text-muted-foreground ml-2">· {p.reference}</span>}
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(p.date)}</span>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-3 mr-1" /> Registrar pago
        </Button>
      ) : (
        <PaymentForm
          totalAmount={totalAmount}
          paidAmount={totalPaid}
          mode="ticket"
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
