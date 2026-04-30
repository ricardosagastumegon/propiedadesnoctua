import { z } from "zod"

export const tenantSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  fullName: z.string().min(1, "Nombre requerido"),
  documentType: z.enum(["DPI", "PASSPORT", "NIT", "OTHER"]),
  documentNumber: z.string().min(1, "Numero de documento requerido"),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: z.string().min(1, "Telefono requerido"),
  alternatePhone: z.string().optional(),
  occupation: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
})

export type TenantFormValues = z.infer<typeof tenantSchema>

export const DOCUMENT_TYPES: Record<string, string> = {
  DPI: "DPI",
  PASSPORT: "Pasaporte",
  NIT: "NIT",
  OTHER: "Otro",
}

export const TENANT_TYPES: Record<string, string> = {
  INDIVIDUAL: "Persona individual",
  COMPANY: "Empresa",
}
