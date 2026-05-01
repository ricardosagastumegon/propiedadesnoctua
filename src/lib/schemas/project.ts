import { z } from "zod"

export const projectSchema = z.object({
  propertyId: z.string().optional().nullable(),
  type: z.enum(["RENOVATION", "CONSTRUCTION", "INSTALLATION", "LANDSCAPING", "PAINTING", "ELECTRICAL", "PLUMBING", "OTHER"]),
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budgetEstimate: z.coerce.number().min(0).optional().nullable(),
  progressPercent: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().optional(),
})

export const projectCostSchema = z.object({
  type: z.enum(["MATERIAL", "LABOR", "EQUIPMENT", "PERMIT", "OTHER"]),
  description: z.string().min(1, "Descripcion requerida"),
  amount: z.coerce.number().min(0),
  date: z.string().min(1, "Fecha requerida"),
  notes: z.string().optional(),
})

export const partidaSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  budgetEstimate: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional(),
})

export const partidaPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Monto requerido"),
  date: z.string().min(1, "Fecha requerida"),
  method: z.string().min(1, "Metodo requerido"),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export const PROJECT_TYPES: Record<string, string> = {
  RENOVATION: "Remodelacion",
  CONSTRUCTION: "Construccion",
  INSTALLATION: "Instalacion",
  LANDSCAPING: "Jardineria",
  PAINTING: "Pintura",
  ELECTRICAL: "Electrico",
  PLUMBING: "Plomeria",
  OTHER: "Otro",
}

export const PROJECT_STATUSES: Record<string, string> = {
  PLANNING: "Planificacion",
  IN_PROGRESS: "En progreso",
  ON_HOLD: "En pausa",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
}

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  ON_HOLD: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
}

export const COST_TYPES: Record<string, string> = {
  MATERIAL: "Material",
  LABOR: "Mano de obra",
  EQUIPMENT: "Equipo",
  PERMIT: "Permiso",
  OTHER: "Otro",
}

export const PARTIDA_STATUSES: Record<string, string> = {
  PENDING_QUOTES: "Sin cotizaciones",
  AWAITING_APPROVAL: "Esperando aprobacion",
  APPROVED: "Aprobada",
  IN_PROGRESS: "En progreso",
  DELIVERED: "Entregada",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
}

export const PARTIDA_STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTES: "bg-gray-100 text-gray-700",
  AWAITING_APPROVAL: "bg-blue-100 text-blue-800",
  APPROVED: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  PAID: "bg-emerald-200 text-emerald-900",
  CANCELLED: "bg-red-100 text-red-700",
}

export const PAYMENT_TYPES: Record<string, string> = {
  ADVANCE: "Anticipo",
  PARTIAL: "Parcial",
  FINAL: "Pago final",
}
