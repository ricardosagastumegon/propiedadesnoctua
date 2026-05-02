"use client"
import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { formatGTQ, formatDate } from "@/lib/format"
import { TrendingUp, TrendingDown, Clock, DollarSign, Download } from "lucide-react"
import type { VendorStatement } from "@/lib/vendor-statements"

const METHOD_LABELS: Record<string, string> = {
  TRANSFER: "Transferencia",
  CASH: "Efectivo",
  CHECK: "Cheque",
  CAJA_CHICA: "Caja Chica",
  REIMBURSEMENT: "Reembolso",
}
const TYPE_LABELS: Record<string, string> = {
  ADVANCE: "Anticipo",
  PARTIAL: "Parcial",
  FINAL: "Pago final",
}
const SOURCE_LABELS: Record<string, string> = {
  PARTIDA: "Partida",
  TICKET: "Ticket",
  INVOICE: "Factura",
}
const SOURCE_COLORS: Record<string, string> = {
  PARTIDA: "bg-blue-100 text-blue-700",
  TICKET: "bg-amber-100 text-amber-700",
  INVOICE: "bg-purple-100 text-purple-700",
}

function csvDownload(filename: string, rows: string[][]) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const url = `data:text/csv;charset=utf-8,﻿${encodeURIComponent(content)}`
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
}

export function VendorStatementTab({ statement }: { statement: VendorStatement }) {
  const [tab, setTab] = useState<"commitments" | "payments">("commitments")
  const [filterSource, setFilterSource] = useState("")

  const filteredCommitments = useMemo(() =>
    filterSource ? statement.commitments.filter(c => c.source === filterSource) : statement.commitments,
    [statement.commitments, filterSource]
  )
  const filteredPayments = useMemo(() =>
    filterSource ? statement.payments.filter(p => p.source === filterSource) : statement.payments,
    [statement.payments, filterSource]
  )

  function exportCommitments() {
    csvDownload("compromisos.csv", [
      ["Fuente", "Descripción", "Propiedad", "Fecha", "Comprometido", "Pagado", "Saldo", "Estado"],
      ...filteredCommitments.map(c => [
        SOURCE_LABELS[c.source], c.label, c.propertyName ?? "", formatDate(new Date(c.date)),
        c.committed.toFixed(2), c.paid.toFixed(2), c.balance.toFixed(2), c.status,
      ]),
    ])
  }

  function exportPayments() {
    csvDownload("pagos.csv", [
      ["Fuente", "Descripción", "Fecha", "Monto", "Método", "Tipo", "%", "Descuento"],
      ...filteredPayments.map(p => [
        SOURCE_LABELS[p.source], p.label, formatDate(new Date(p.date)),
        p.amount.toFixed(2), METHOD_LABELS[p.method] ?? p.method,
        p.type ? (TYPE_LABELS[p.type] ?? p.type) : "",
        p.percentageOfTotal != null ? `${p.percentageOfTotal}%` : "",
        p.discountAmount?.toFixed(2) ?? "",
      ]),
    ])
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <TrendingUp className="size-3" /> Comprometido
          </p>
          <p className="font-display text-lg tabular-nums">{formatGTQ(statement.totalCommitted)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <DollarSign className="size-3" /> Pagado
          </p>
          <p className="font-display text-lg tabular-nums text-emerald-600">{formatGTQ(statement.totalPaid)}</p>
        </Card>
        <Card className={`p-4 ${statement.totalBalance > 0 ? "border-amber-300" : ""}`}>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <TrendingDown className="size-3" /> Saldo pendiente
          </p>
          <p className={`font-display text-lg tabular-nums ${statement.totalBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {formatGTQ(statement.totalBalance)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Clock className="size-3" /> Próx. vencimiento
          </p>
          <p className="font-display text-base">
            {statement.nextDueDate ? formatDate(new Date(statement.nextDueDate)) : "—"}
          </p>
        </Card>
      </div>

      {/* Source filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {["", "PARTIDA", "TICKET", "INVOICE"].map(s => (
          <button key={s} onClick={() => setFilterSource(s)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterSource === s ? "bg-foreground text-background border-foreground" : "border-muted-foreground/30 text-muted-foreground hover:border-foreground/40"
            }`}>
            {s === "" ? "Todo" : SOURCE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        {(["commitments", "payments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t === "commitments" ? `Compromisos (${filteredCommitments.length})` : `Pagos (${filteredPayments.length})`}
          </button>
        ))}
        <button onClick={tab === "commitments" ? exportCommitments : exportPayments}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2">
          <Download className="size-3.5" /> CSV
        </button>
      </div>

      {tab === "commitments" && (
        filteredCommitments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin compromisos registrados.</p>
        ) : (
          <div className="space-y-2">
            {filteredCommitments.map(c => (
              <div key={`${c.source}-${c.id}`}
                className="flex items-start justify-between border rounded-lg p-3 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_COLORS[c.source]}`}>
                      {SOURCE_LABELS[c.source]}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(new Date(c.date))}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{c.label}</p>
                  {c.propertyName && <p className="text-xs text-muted-foreground">{c.propertyName}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Comprometido</p>
                  <p className="text-sm font-medium tabular-nums">{formatGTQ(c.committed)}</p>
                  <div className="flex gap-3 text-xs mt-1">
                    <span className="text-emerald-600">Pagado {formatGTQ(c.paid)}</span>
                    <span className={c.balance > 0 ? "text-amber-600" : "text-muted-foreground"}>
                      Saldo {formatGTQ(c.balance)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "payments" && (
        filteredPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin pagos registrados.</p>
        ) : (
          <div className="space-y-2">
            {filteredPayments.map(p => (
              <div key={`${p.source}-${p.id}`}
                className="flex items-start justify-between border rounded-lg p-3 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_COLORS[p.source]}`}>
                      {SOURCE_LABELS[p.source]}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(new Date(p.date))}</span>
                    {p.type && (
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[p.type] ?? p.type}</span>
                    )}
                    {p.percentageOfTotal != null && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{p.percentageOfTotal}%</span>
                    )}
                  </div>
                  <p className="text-sm truncate">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium tabular-nums">{formatGTQ(p.amount)}</p>
                  {p.closesWithDiscount && p.discountAmount && (
                    <p className="text-xs text-amber-600">desc. {formatGTQ(p.discountAmount)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
