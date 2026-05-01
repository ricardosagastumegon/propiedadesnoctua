import { z } from "zod"

export const vendorSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  type: z.enum(["COMPANY", "INDIVIDUAL"]).default("COMPANY"),
  category: z.enum(["PLUMBING", "ELECTRICAL", "HVAC", "CONSTRUCTION", "CLEANING", "LANDSCAPING", "SECURITY", "APPLIANCE", "PAINTING", "OTHER"]),
  taxId: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1, "Telefono requerido"),
  address: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional().nullable(),
  notes: z.string().optional(),
})

export const quoteSchema = z.object({
  vendorId: z.string().min(1, "Proveedor requerido"),
  projectId: z.string().optional().nullable(),
  date: z.string().min(1, "Fecha requerida"),
  validUntil: z.string().optional().nullable(),
  subtotal: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  notes: z.string().optional(),
})

export const VENDOR_CATEGORIES: Record<string, string> = {
  PLUMBING: "Plomeria",
  ELECTRICAL: "Electricidad",
  HVAC: "Aire acondicionado",
  CONSTRUCTION: "Construccion",
  CLEANING: "Limpieza",
  LANDSCAPING: "Jardineria",
  SECURITY: "Seguridad",
  APPLIANCE: "Electrodomesticos",
  PAINTING: "Pintura",
  OTHER: "Otro",
}

export const QUOTE_STATUSES: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Expirada",
}

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-500",
}
