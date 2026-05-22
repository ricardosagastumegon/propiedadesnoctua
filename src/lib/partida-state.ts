// Estado computado de una partida según sus datos. Espejo de ticket-state.ts.
// Reemplaza la función computeDisplay duplicada en _partida-list.tsx y _pagos-tab.tsx.

export type PartidaComputedState =
  | "PENDING_QUOTES"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "PENDING_ACCEPTANCE"
  | "DELIVERED"
  | "PAID"
  | "CANCELLED"

export interface PartidaStateInput {
  status: string  // status crudo de DB (CANCELLED es manual)
  amountApproved: number | null
  amountPaid: number
  deliveredAt: Date | null
  approvedQuoteId: string | null
  hasQuotes: boolean
  hasApprovalPending: boolean  // hay un ApprovalRequest PENDING/PENDING_COSIGN para esta partida
  hasAcceptancePending: boolean
  hasAcceptanceAccepted: boolean
  prepaymentCapPercentage: number
}

export interface ComputedPartidaState {
  state: PartidaComputedState
  label: string
  color: string
  reason: string
}

export function computePartidaState(p: PartidaStateInput): ComputedPartidaState {
  // Manual / terminal: CANCELLED tiene prioridad
  if (p.status === "CANCELLED") {
    return {
      state: "CANCELLED",
      label: "Cancelada",
      color: "bg-red-100 text-red-700",
      reason: "Marcada como cancelada manualmente.",
    }
  }

  const approved = p.amountApproved ?? 0
  const pct = approved > 0 ? (p.amountPaid / approved) * 100 : 0
  const isFullyPaid = approved > 0 && p.amountPaid >= approved

  if (isFullyPaid && p.deliveredAt) {
    return {
      state: "PAID",
      label: "Pagada ✓",
      color: "bg-emerald-100 text-emerald-800",
      reason: "100% pagado y servicio entregado/aceptado.",
    }
  }

  if (p.deliveredAt) {
    return {
      state: "DELIVERED",
      label: "Entregada",
      color: "bg-blue-100 text-blue-800",
      reason: "Servicio entregado, pago pendiente.",
    }
  }

  // 80% pagado + aceptación PENDING bloquea el pago final
  if (
    approved > 0 &&
    pct >= p.prepaymentCapPercentage - 0.001 &&
    pct < 100 &&
    p.hasAcceptancePending
  ) {
    return {
      state: "PENDING_ACCEPTANCE",
      label: "Esp. aceptación",
      color: "bg-cyan-100 text-cyan-800",
      reason: `Alcanzó ${pct.toFixed(0)}% pagado — pago final bloqueado hasta aceptación de servicio.`,
    }
  }

  if (p.amountPaid > 0) {
    return {
      state: "IN_PROGRESS",
      label: "En progreso",
      color: "bg-amber-100 text-amber-800",
      reason: `Pago parcial ${pct.toFixed(0)}% registrado.`,
    }
  }

  if (p.approvedQuoteId) {
    return {
      state: "APPROVED",
      label: "Aprobada",
      color: "bg-purple-100 text-purple-800",
      reason: "Cotización aprobada, lista para anticipo.",
    }
  }

  if (p.hasApprovalPending) {
    return {
      state: "AWAITING_APPROVAL",
      label: "Esp. aprobación",
      color: "bg-gray-100 text-gray-600",
      reason: "Cotización enviada y esperando autorización.",
    }
  }

  if (p.hasQuotes) {
    return {
      state: "AWAITING_APPROVAL",
      label: "Esp. aprobación",
      color: "bg-gray-100 text-gray-600",
      reason: "Cotizaciones cargadas, falta seleccionar/aprobar una.",
    }
  }

  return {
    state: "PENDING_QUOTES",
    label: "Sin cotización",
    color: "bg-gray-100 text-gray-500",
    reason: "Sin cotizaciones aún.",
  }
}
