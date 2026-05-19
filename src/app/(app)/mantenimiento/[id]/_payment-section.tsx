"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PaymentForm, type PaymentFormData } from "@/components/shared/payment-form"
import { addTicketPayment } from "../actions"
import { requestAcceptance } from "../../aceptaciones/actions"
import { formatGTQ, formatDate } from "@/lib/format"
import { Plus, CheckCircle2 } from "lucide-react"

export interface TicketAcceptanceCtx {
  cap: number
  hasAcceptance: boolean
  acceptanceStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "SUPERSEDED" | null
  acceptedByName: string | null
  acceptedAt: string | null
  acceptanceId: string | null
}

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
  vendorId: string | null
  vendor: { id: string; name: string } | null
}

interface SelectedQuote {
  id: string
  vendorId: string
  vendor: { id: string; name: string }
  amount: number
}

function VendorPaymentBlock({
  ticketId,
  vendor,
  quoteAmount,
  payments,
  acceptanceCtx,
}: {
  ticketId: string
  vendor: { id: string; name: string }
  quoteAmount: number
  payments: Payment[]
  acceptanceCtx?: TicketAcceptanceCtx
}) {
  const [showForm, setShowForm] = useState(false)
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  const pct = quoteAmount > 0 ? Math.min(100, Math.round((paid / quoteAmount) * 100)) : 0
  const isFullyPaid = paid >= quoteAmount

  async function handleSubmit(data: PaymentFormData) {
    const fd = new FormData()
    fd.set("vendorId", vendor.id)
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
    <div className="border rounded-lg overflow-hidden">
      {/* Vendor header */}
      <div className={`px-4 py-3 flex items-center justify-between ${isFullyPaid ? "bg-emerald-50 border-b border-emerald-200" : "bg-muted/40 border-b"}`}>
        <div className="flex items-center gap-2">
          {isFullyPaid && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
          <span className="text-sm font-medium">{vendor.name}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{formatGTQ(paid)} / {formatGTQ(quoteAmount)}</span>
          <span className={`text-xs font-medium ${isFullyPaid ? "text-emerald-600" : "text-amber-600"}`}>{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted">
        <div
          className={`h-1.5 transition-all ${isFullyPaid ? "bg-emerald-500" : "bg-foreground"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="p-3 space-y-2">
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin pagos registrados.</p>
        ) : (
          <div className="space-y-1">
            {payments.map(p => (
              <div key={p.id} className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm">
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
            totalAmount={quoteAmount}
            paidAmount={paid}
            mode="ticket"
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            acceptanceCtx={acceptanceCtx ? {
              cap: acceptanceCtx.cap,
              hasAcceptance: acceptanceCtx.hasAcceptance,
              acceptanceStatus: acceptanceCtx.acceptanceStatus,
              acceptedByName: acceptanceCtx.acceptedByName,
              acceptedAt: acceptanceCtx.acceptedAt,
              acceptanceId: acceptanceCtx.acceptanceId,
              requestAcceptance: async () => await requestAcceptance("TICKET", ticketId),
            } : undefined}
          />
        )}
      </div>
    </div>
  )
}

export function PaymentSection({
  ticketId,
  payments,
  totalAmount,
  selectedQuotes = [],
  acceptanceCtx,
}: {
  ticketId: string
  payments: Payment[]
  totalAmount: number | null
  selectedQuotes?: SelectedQuote[]
  acceptanceCtx?: TicketAcceptanceCtx
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

  // Multi-vendor: show per-vendor blocks
  if (selectedQuotes.length > 1) {
    return (
      <div className="space-y-4">
        {selectedQuotes.map(q => {
          const vendorPayments = payments.filter(p => p.vendorId === q.vendorId)
          return (
            <VendorPaymentBlock
              key={q.id}
              ticketId={ticketId}
              vendor={q.vendor}
              quoteAmount={q.amount}
              payments={vendorPayments}
              acceptanceCtx={acceptanceCtx}
            />
          )
        })}

        {/* Summary row */}
        <div className="flex justify-between text-sm pt-1 border-t">
          <span className="text-muted-foreground">Total pagado</span>
          <span className="font-medium tabular-nums text-emerald-600">{formatGTQ(totalPaid)}</span>
        </div>
        {totalAmount != null && totalAmount > totalPaid && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo pendiente</span>
            <span className="font-medium tabular-nums text-amber-600">{formatGTQ(totalAmount - totalPaid)}</span>
          </div>
        )}
      </div>
    )
  }

  // Single vendor or no quotes selected: flat list
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
          acceptanceCtx={acceptanceCtx ? {
            cap: acceptanceCtx.cap,
            hasAcceptance: acceptanceCtx.hasAcceptance,
            acceptanceStatus: acceptanceCtx.acceptanceStatus,
            acceptedByName: acceptanceCtx.acceptedByName,
            acceptedAt: acceptanceCtx.acceptedAt,
            acceptanceId: acceptanceCtx.acceptanceId,
            requestAcceptance: async () => await requestAcceptance("TICKET", ticketId),
          } : undefined}
        />
      )}
    </div>
  )
}
