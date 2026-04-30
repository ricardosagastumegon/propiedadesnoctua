import { z } from "zod"

export const propertySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  alias: z.string().optional(),
  type: z.enum(["HOUSE", "APARTMENT", "CHALET", "COMMERCIAL", "OFFICE", "WAREHOUSE", "BUILDING", "LAND"]),
  status: z.enum(["ACTIVE", "INACTIVE", "FOR_SALE", "SOLD"]).default("ACTIVE"),
  addressLine: z.string().min(1, "Dirección requerida"),
  zone: z.string().optional(),
  city: z.string().min(1, "Ciudad requerida"),
  department: z.string().min(1, "Departamento requerido"),
  country: z.string().default("Guatemala"),
  postalCode: z.string().optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  totalArea: z.coerce.number().positive().optional().nullable(),
  builtArea: z.coerce.number().positive().optional().nullable(),
  bedrooms: z.coerce.number().int().min(0).optional().nullable(),
  bathrooms: z.coerce.number().min(0).optional().nullable(),
  parkingSpaces: z.coerce.number().int().min(0).optional().nullable(),
  yearBuilt: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
  acquisitionDate: z.string().optional().nullable(),
  acquisitionCost: z.coerce.number().positive().optional().nullable(),
  currentValue: z.coerce.number().positive().optional().nullable(),
  propertyTaxYear: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional(),
  coverImageUrl: z.string().optional().nullable(),
})

export type PropertyFormValues = z.infer<typeof propertySchema>

export const PROPERTY_TYPES: Record<string, string> = {
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  CHALET: "Chalet",
  COMMERCIAL: "Comercial",
  OFFICE: "Oficina",
  WAREHOUSE: "Bodega",
  BUILDING: "Edificio",
  LAND: "Terreno",
}

export const PROPERTY_STATUSES: Record<string, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  FOR_SALE: "En venta",
  SOLD: "Vendida",
}

export const DEPARTMENTS = [
  "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso",
  "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa",
  "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez",
  "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa",
]
