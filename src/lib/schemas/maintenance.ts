import { z } from "zod"

export const maintenanceSchema = z.object({
  propertyId: z.string().min(1, "Propiedad requerida"),
  assetId: z.string().optional().nullable(),
  category: z.enum(["PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL", "PAINTING", "APPLIANCE", "SECURITY", "CLEANING", "LANDSCAPING", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  title: z.string().min(1, "Titulo requerido"),
  description: z.string().min(1, "Descripcion requerida"),
  reportedBy: z.string().optional(),
  reportedPhone: z.string().optional(),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
})

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>

export const CATEGORIES: Record<string, string> = {
  PLUMBING: "Plomeria",
  ELECTRICAL: "Electricidad",
  HVAC: "Aire acondicionado",
  STRUCTURAL: "Estructura",
  PAINTING: "Pintura",
  APPLIANCE: "Electrodomesticos",
  SECURITY: "Seguridad",
  CLEANING: "Limpieza",
  LANDSCAPING: "Jardineria",
  OTHER: "Otro",
}

export const PRIORITIES: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
}

export const TICKET_STATUSES: Record<string, string> = {
  REPORTED: "Reportado",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
}
