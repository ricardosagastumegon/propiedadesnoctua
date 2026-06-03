import { z } from "zod"

// Zod 4: z.preprocess() retorna ZodPipe que NO hereda la optionality del
// esquema interno. Si el campo no está en el FormData (ej. latitude/longitude
// que no tienen input en el form), Zod tira "expected nonoptional, received
// undefined". La fix es .optional() en el OUTER del pipe.
const numOpt = () => z.preprocess(
  v => (v === "" || v === null || v === undefined) ? null : v,
  z.coerce.number().nullable()
).optional()
const intOpt = () => z.preprocess(
  v => (v === "" || v === null || v === undefined) ? null : v,
  z.coerce.number().int().nullable()
).optional()

export const propertySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  alias: z.string().optional(),
  type: z.enum(["HOUSE", "APARTMENT", "CHALET", "COMMERCIAL", "OFFICE", "WAREHOUSE", "BUILDING", "LAND", "VACATION"]),
  status: z.enum(["AVAILABLE", "RENTED", "MAINTENANCE", "INACTIVE", "FOR_SALE", "SOLD"]).default("AVAILABLE"),
  addressLine: z.string().min(1, "Dirección requerida"),
  zone: z.string().optional(),
  city: z.string().min(1, "Ciudad requerida"),
  department: z.string().min(1, "Departamento requerido"),
  country: z.string().default("Guatemala"),
  postalCode: z.string().optional(),
  latitude: numOpt(),
  longitude: numOpt(),
  // JSON string del array de vértices [lat, lon]; "" si no hay polígono.
  mapPolygon: z.string().optional(),
  totalArea: numOpt(),
  builtArea: numOpt(),
  bedrooms: intOpt(),
  bathrooms: numOpt(),
  parkingSpaces: intOpt(),
  yearBuilt: intOpt(),
  acquisitionDate: z.string().optional().nullable(),
  acquisitionCost: numOpt(),
  currentValue: numOpt(),
  propertyTaxYear: numOpt(),
  notes: z.string().optional(),
  coverImageUrl: z.string().optional().nullable(),
  // JSON string de array de URLs (galería). "" o ausente = sin galería.
  galleryUrls: z.string().optional(),
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
  VACATION: "Vacacional",
}

export const PROPERTY_STATUSES: Record<string, string> = {
  AVAILABLE: "Disponible",
  RENTED: "Arrendada",
  MAINTENANCE: "Mantenimiento",
  INACTIVE: "Inactiva",
  FOR_SALE: "En venta",
  SOLD: "Vendida",
}

export const PROPERTY_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RENTED: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-gray-100 text-gray-600",
  FOR_SALE: "bg-purple-100 text-purple-800",
  SOLD: "bg-gray-200 text-gray-500",
}

export const DEPARTMENTS = [
  "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso",
  "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa",
  "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez",
  "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa",
]
