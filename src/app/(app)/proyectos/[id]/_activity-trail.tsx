"use client"
import { formatDate } from "@/lib/format"
import type { ActivityEntry } from "@/lib/project-activity-trail"

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Creado",
  UPDATED: "Actualizado",
  DELETED: "Eliminado",
  STATUS_CHANGED: "Cambio de estado",
  PAYMENT_REGISTERED: "Pago registrado",
  QUOTE_ADDED: "Cotización agregada",
  QUOTE_SELECTED: "Cotización seleccionada",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  COSIGNED: "Co-firmado",
  ESCALATED: "Escalado a proyecto",
  CANCELLED: "Cancelado",
  DELIVERED: "Marcado entregado",
  APPROVAL_REQUESTED: "Autorización solicitada",
}

const ACTION_COLORS: Record<string, string> = {
  CREATED: "bg-blue-500",
  APPROVED: "bg-emerald-500",
  COSIGNED: "bg-emerald-400",
  PAYMENT_REGISTERED: "bg-purple-500",
  REJECTED: "bg-red-500",
  DELETED: "bg-red-400",
  CANCELLED: "bg-red-300",
  DELIVERED: "bg-teal-500",
  QUOTE_ADDED: "bg-amber-500",
  QUOTE_SELECTED: "bg-amber-600",
  APPROVAL_REQUESTED: "bg-orange-500",
  ESCALATED: "bg-indigo-500",
  STATUS_CHANGED: "bg-slate-400",
  UPDATED: "bg-slate-400",
}

const ENTITY_LABELS: Record<string, string> = {
  PROJECT: "Proyecto",
  PARTIDA: "Partida",
  PAYMENT: "Pago",
  QUOTE: "Cotización",
  APPROVAL: "Autorización",
  TICKET: "Ticket",
}

function formatMeta(action: string, meta: Record<string, unknown> | null): string {
  if (!meta) return ""
  const parts: string[] = []
  if (meta.partida) parts.push(`Partida: ${meta.partida}`)
  if (meta.name) parts.push(`${meta.name}`)
  if (meta.vendor) parts.push(`Proveedor: ${meta.vendor}`)
  if (meta.amount && typeof meta.amount === "number") parts.push(`Q${(meta.amount as number).toFixed(2)}`)
  if (meta.method) parts.push(`via ${meta.method}`)
  if (meta.percentageOfTotal) parts.push(`${meta.percentageOfTotal}%`)
  if (meta.status) parts.push(`→ ${meta.status}`)
  if (meta.reason) parts.push(`Motivo: ${meta.reason}`)
  if (meta.projectName) parts.push(`Proyecto: ${meta.projectName}`)
  return parts.join(" · ")
}

export function ActivityTrail({ trail }: { trail: ActivityEntry[] }) {
  if (trail.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Sin actividad registrada aún. Las acciones futuras (pagos, aprobaciones, cambios de estado) aparecerán aquí.
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-0">
        {trail.map((entry, i) => {
          const color = ACTION_COLORS[entry.action] ?? "bg-gray-400"
          const label = ACTION_LABELS[entry.action] ?? entry.action
          const entityLabel = ENTITY_LABELS[entry.entityType] ?? entry.entityType
          const detail = formatMeta(entry.action, entry.metadata)
          return (
            <div key={entry.id} className="flex gap-4 pl-8 relative pb-4">
              <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full ${color} ring-2 ring-background shrink-0`} />
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{entityLabel}</span>
                    {detail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{detail}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(new Date(entry.createdAt))}</p>
                    {entry.actorName && <p className="text-xs font-medium text-foreground">{entry.actorName}</p>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
