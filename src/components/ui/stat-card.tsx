import { type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; label?: string }
  hint?: string
  className?: string
}

export function StatCard({ label, value, icon: Icon, trend, hint, className }: StatCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="font-display text-3xl tabular-nums">{value}</div>
      {trend && (
        <div className={cn("flex items-center gap-1 mt-1 text-xs", trend.value >= 0 ? "text-emerald-600" : "text-destructive")}>
          <span>{trend.value >= 0 ? "+" : ""}{trend.value}%</span>
          {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
        </div>
      )}
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  )
}
