"use client"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Point { label: string; income: number; expense: number }

export function DashboardChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dashIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dashExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`Q${v.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`, undefined]} />
        <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" fill="url(#dashIncome)" strokeWidth={2} />
        <Area type="monotone" dataKey="expense" name="Egresos" stroke="#ef4444" fill="url(#dashExpense)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
