import { z } from "zod"

export const assetSchema = z.object({
  propertyId: z.string().optional().nullable(),
  category: z.enum(["VEHICLE", "APPLIANCE", "FURNITURE", "HVAC", "SECURITY", "TOOL", "ELECTRONICS", "OTHER"]),
  name: z.string().min(1, "Nombre requerido"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCost: z.coerce.number().min(0).optional().nullable(),
  currentValue: z.coerce.number().min(0).optional().nullable(),
  warranty: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE", "DISPOSED"]).default("ACTIVE"),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export const serviceLogSchema = z.object({
  serviceType: z.string().min(1, "Tipo requerido"),
  date: z.string().min(1, "Fecha requerida"),
  cost: z.coerce.number().min(0),
  performedBy: z.string().optional(),
  nextServiceAt: z.string().optional().nullable(),
  notes: z.string().optional(),
})

export const ASSET_CATEGORIES: Record<string, string> = {
  VEHICLE: "Vehiculo / Embarcacion",
  APPLIANCE: "Electrodomestico",
  FURNITURE: "Mobiliario",
  HVAC: "Aire acondicionado",
  SECURITY: "Seguridad",
  TOOL: "Herramienta",
  ELECTRONICS: "Electronico",
  OTHER: "Otro",
}

export const ASSET_STATUSES: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  MAINTENANCE: "En mantenimiento",
  DISPOSED: "Dado de baja",
}

export const ASSET_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-gray-100 text-gray-500",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  DISPOSED: "bg-red-100 text-red-800",
}
