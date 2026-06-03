import { z } from "zod"

export const contractSchema = z.object({
  contractNumber: z.string().min(1, "Numero de contrato requerido"),
  propertyId: z.string().min(1, "Propiedad requerida"),
  unitId: z.string().optional().nullable(),
  parcelId: z.string().optional().nullable(),
  tenantId: z.string().min(1, "Inquilino requerido"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
  monthlyRent: z.coerce.number().positive("Renta debe ser positiva"),
  currency: z.string().default("GTQ"),
  deposit: z.coerce.number().min(0).optional().nullable(),
  paymentDueDay: z.coerce.number().int().min(1).max(31),
  paymentFrequency: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "ANNUAL"]).default("MONTHLY"),
  includesUtilities: z.coerce.boolean().default(false),
  utilitiesNotes: z.string().optional(),
  lateFeePercent: z.coerce.number().min(0).optional().nullable(),
  annualIncrease: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "TERMINATED"]).default("DRAFT"),
  notes: z.string().optional(),
})

export type ContractFormValues = z.infer<typeof contractSchema>

export const PAYMENT_FREQUENCY: Record<string, string> = {
  MONTHLY: "Mensual",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  ANNUAL: "Anual",
}
