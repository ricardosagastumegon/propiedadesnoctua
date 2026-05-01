"use client"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ChartPoint { label: string; income: number; expense: number }

function formatK(value: number) {
  if (value >= 1000) return `Q${(value / 1000).toFixed(0)}k`
  return `Q${value.toFixed(0)}`
}

export function IncomeExpenseChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatK} tick={{ fontSize: 12 }} width={50} />
        <Tooltip
          formatter={(value) => [`Q${Number(value).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`, undefined]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend />
        <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="expense" name="Egresos" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
