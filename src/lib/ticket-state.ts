// Auto-computed ticket state based on data — single source of truth.

export type TicketComputedState =
  | "REPORTED"
  | "ASSIGNED"
  | "AWAITING_PAYMENT_INFO"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "PENDING_ACCEPTANCE"
  | "COMPLETED"
  | "ESCALATED"
  | "CANCELLED"
  | "ON_HOLD"

interface TicketInput {
  status: string  // explicit status (used for terminal/manual: CANCELLED, ESCALATED, ON_HOLD, COMPLETED)
  assignedToId: string | null
  paymentMode: string | null
  amountPaid: number
  totalAmount: number | null
  completedAt: Date | null
  escalatedToProjectId: string | null
  hasApprovalPending: boolean
  hasApprovalApproved: boolean
  hasAcceptancePending: boolean
  hasAcceptanceAccepted: boolean
  prepaymentCapPercentage: number  // typically 80
}

export interface ComputedState {
  state: TicketComputedState
  label: string
  color: string  // tailwind classes
  reason: string  // for tooltip
}

export function computeTicketState(t: TicketInput): ComputedState {
  // Manual / terminal states take precedence
  if (t.status === "CANCELLED") return { state: "CANCELLED", label: "Cancelado", color: "bg-gray-100 text-gray-600", reason: "Marcado como cancelado manualmente." }
  if (t.status === "ON_HOLD") return { state: "ON_HOLD", label: "En espera", color: "bg-slate-100 text-slate-700", reason: "Puesto en espera manualmente." }
  if (t.escalatedToProjectId) return { state: "ESCALATED", label: "Escalado a proyecto", color: "bg-indigo-100 text-indigo-700", reason: "Convertido a proyecto formal." }

  // 100% pagado
  if (t.totalAmount && t.amountPaid >= t.totalAmount) {
    return { state: "COMPLETED", label: "Completado", color: "bg-emerald-100 text-emerald-800", reason: "Pagado al 100% y servicios aceptados (o no requería aceptación)." }
  }

  // Pasado del cap sin aceptación
  const pct = t.totalAmount && t.totalAmount > 0 ? (t.amountPaid / t.totalAmount) * 100 : 0
  if (pct >= t.prepaymentCapPercentage - 0.001 && pct < 100 && t.hasAcceptancePending) {
    return { state: "PENDING_ACCEPTANCE", label: "Esperando aceptación", color: "bg-cyan-100 text-cyan-800", reason: `Alcanzó ${pct.toFixed(0)}% pagado — pago final bloqueado hasta aceptación de servicio.` }
  }

  // Hay pagos parciales
  if (t.amountPaid > 0) {
    return { state: "IN_PROGRESS", label: "En progreso", color: "bg-amber-100 text-amber-800", reason: `Pago parcial ${pct.toFixed(0)}% registrado, trabajo en curso.` }
  }

  // Aprobado pero sin pagos
  if (t.hasApprovalApproved) {
    return { state: "APPROVED", label: "Aprobado", color: "bg-purple-100 text-purple-800", reason: "Cotización aprobada, listo para anticipo." }
  }

  // En espera de autorización
  if (t.hasApprovalPending) {
    return { state: "AWAITING_APPROVAL", label: "En autorización", color: "bg-orange-100 text-orange-700", reason: "Cotización enviada y esperando aprobación." }
  }

  // Tiene responsable pero falta definir modo de pago
  if (t.assignedToId && !t.paymentMode) {
    return { state: "AWAITING_PAYMENT_INFO", label: "Falta modo de pago", color: "bg-yellow-100 text-yellow-800", reason: "Asignado a responsable pero sin definir el modo de pago." }
  }

  if (t.assignedToId) {
    return { state: "ASSIGNED", label: "Asignado", color: "bg-blue-100 text-blue-800", reason: "Asignado a un responsable, pendiente de iniciar." }
  }

  return { state: "REPORTED", label: "Reportado", color: "bg-slate-100 text-slate-700", reason: "Recién creado — falta asignar responsable." }
}
