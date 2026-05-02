"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { BackButton } from "@/components/shared/back-button"
import { formatGTQ, formatDate } from "@/lib/format"
import { TrendingDown, DollarSign, AlertTriangle, Download, ExternalLink } from "lucide-react"
import { VENDOR_CATEGORIES } from "@/lib/schemas/vendor"

interface Row {
  id: string
  name: string
  category: string
  phone: string
  totalCommitted: number
  totalPaid: number
  totalBalance: number
  lastPaymentDate: string | null
  overdueInvoices: number
}

interface Totals {
  committed: number
  paid: number
  balance: number
  overdue: number
}

function csvDownload(rows: Row[]) {
  const header = ["Proveedor", "Categoría", "Comprometido", "Pagado", "Saldo", "Último pago", "Facturas vencidas"]
  const data = rows.map(r => [
    r.name,
    VENDOR_CATEGORIES[r.category] ?? r.category,
    r.totalCommitted.toFixed(2),
    r.totalPaid.toFixed(2),
    r.totalBalance.toFixed(2),
    r.lastPaymentDate ? formatDate(new Date(r.lastPaymentDate)) : "",
    r.overdueInvoices.toString(),
  ])
  const content = [header, ...data].map(row => row.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
  const url = `data:text/csv;charset=utf-8,﻿${encodeURIComponent(content)}`
  const a = document.createElement("a"); a.href = url; a.download = "estados-cuenta.csv"; a.click()
}

export function EstadosCuentaClient({ rows, totals }: { rows: Row[]; totals: Totals }) {
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterBalance, setFilterBalance] = useState<"all" | "pending" | "overdue">("all")

  const categories = useMemo(() => Array.from(new Set(rows.map(r => r.category))), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory && r.category !== filterCategory) return false
    if (filterBalance === "pending" && r.totalBalance <= 0) return false
    if (filterBalance === "overdue" && r.overdueInvoices === 0) return false
    return true
  }), [rows, search, filterCategory, filterBalance])

  const pctPaid = totals.committed > 0 ? Math.round((totals.paid / totals.committed) * 100) : 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <BackButton href="/reportes" label="Reportes" />
      <PageHeader title="Estados de cuenta" description="Saldo pendiente por proveedor — compromisos vs. pagos." />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <TrendingDown className="size-3" /> Total comprometido
          </p>
          <p className="font-display text-lg tabular-nums">{formatGTQ(totals.committed)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <DollarSign className="size-3" /> Total pagado
          </p>
          <p className="font-display text-lg tabular-nums text-emerald-600">{formatGTQ(totals.paid)}</p>
          <p className="text-xs text-muted-foreground">{pctPaid}% del total</p>
        </Card>
        <Card className={`p-4 ${totals.balance > 0 ? "border-amber-300" : ""}`}>
          <p className="text-xs text-muted-foreground mb-1">Saldo pendiente</p>
          <p className={`font-display text-lg tabular-nums ${totals.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {formatGTQ(totals.balance)}
          </p>
        </Card>
        <Card className={`p-4 ${totals.overdue > 0 ? "border-destructive" : ""}`}>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <AlertTriangle className="size-3" /> Facturas vencidas
          </p>
          <p className={`font-display text-2xl tabular-nums ${totals.overdue > 0 ? "text-destructive" : "text-emerald-600"}`}>
            {totals.overdue}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar proveedor..."
          className="text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-48"
        />
        <select
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 bg-background"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => (
            <option key={c} value={c}>{VENDOR_CATEGORIES[c] ?? c}</option>
          ))}
        </select>
        {(["all", "pending", "overdue"] as const).map(v => (
          <button key={v} onClick={() => setFilterBalance(v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterBalance === v ? "bg-foreground text-background border-foreground" : "border-muted-foreground/30 text-muted-foreground hover:border-foreground/40"
            }`}>
            {v === "all" ? "Todos" : v === "pending" ? "Con saldo" : "Vencidos"}
          </button>
        ))}
        <button onClick={() => csvDownload(filtered)}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Download className="size-3.5" /> CSV
        </button>
        <p className="text-xs text-muted-foreground">{filtered.length} proveedor{filtered.length !== 1 ? "es" : ""}</p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No hay proveedores con los filtros actuales.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const pct = r.totalCommitted > 0 ? Math.round((r.totalPaid / r.totalCommitted) * 100) : 0
            return (
              <Card key={r.id} className={`p-4 ${r.overdueInvoices > 0 ? "border-l-4 border-l-destructive" : r.totalBalance > 0 ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/proveedores/${r.id}?tab=estado-cuenta`}
                        className="font-medium text-sm hover:underline">{r.name}</Link>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {VENDOR_CATEGORIES[r.category] ?? r.category}
                      </span>
                      {r.overdueInvoices > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          {r.overdueInvoices} vencida{r.overdueInvoices !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {r.lastPaymentDate && (
                      <p className="text-xs text-muted-foreground">
                        Último pago: {formatDate(new Date(r.lastPaymentDate))}
                      </p>
                    )}
                    {r.totalCommitted > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                          <span>Pagado {pct}%</span>
                          <span>{formatGTQ(r.totalPaid)} / {formatGTQ(r.totalCommitted)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`rounded-full h-1.5 transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-foreground"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-display text-xl tabular-nums ${r.totalBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formatGTQ(r.totalBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground">saldo</p>
                    <Link href={`/proveedores/${r.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 justify-end">
                      Ver detalle <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
