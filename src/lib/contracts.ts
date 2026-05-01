import { differenceInDays } from "date-fns"

export type ContractDisplayStatus = "DRAFT" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "TERMINATED"

export function getContractStatus(contract: {
  status: string
  endDate: Date | string
  terminatedAt?: Date | string | null
}): ContractDisplayStatus {
  if (contract.status === "TERMINATED" || contract.terminatedAt) return "TERMINATED"
  if (contract.status === "DRAFT") return "DRAFT"

  const end = new Date(contract.endDate)
  const today = new Date()

  if (end < today) return "EXPIRED"
  if (contract.status === "ACTIVE" && differenceInDays(end, today) <= 60) return "EXPIRING_SOON"
  return contract.status as ContractDisplayStatus
}

export const STATUS_LABELS: Record<ContractDisplayStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  EXPIRING_SOON: "Por vencer",
  EXPIRED: "Vencido",
  TERMINATED: "Terminado",
}

export const STATUS_VARIANTS: Record<ContractDisplayStatus, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  EXPIRING_SOON: "outline",
  EXPIRED: "outline",
  TERMINATED: "secondary",
}

export const STATUS_CLASS: Record<ContractDisplayStatus, string> = {
  DRAFT: "",
  ACTIVE: "",
  EXPIRING_SOON: "border-amber-400 text-amber-700",
  EXPIRED: "border-red-400 text-red-700 bg-red-50",
  TERMINATED: "",
}
