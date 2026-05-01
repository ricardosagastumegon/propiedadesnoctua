import { z } from "zod"

export const employeeSchema = z.object({
  fullName: z.string().min(1, "Nombre requerido"),
  documentNumber: z.string().min(1, "DPI/NIT requerido"),
  position: z.string().min(1, "Puesto requerido"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(1, "Telefono requerido"),
  hireDate: z.string().min(1, "Fecha de ingreso requerida"),
  terminationDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]).default("ACTIVE"),
  payPeriod: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("MONTHLY"),
  payRate: z.coerce.number().min(0, "Salario requerido"),
  notes: z.string().optional(),
})

export const EMPLOYEE_STATUSES: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  TERMINATED: "Finalizado",
}

export const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-gray-100 text-gray-500",
  TERMINATED: "bg-red-100 text-red-800",
}

export const PAY_PERIODS: Record<string, string> = {
  DAILY: "Diario",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
}
