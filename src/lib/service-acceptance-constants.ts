// Client-safe constants for service acceptance.
// IMPORTANT: this file must NOT import prisma or anything server-only,
// because client components ("use client") import from here.

export type AcceptanceEntityType = "PARTIDA" | "TICKET"
export type AcceptanceStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "SUPERSEDED"

export const DEFAULT_PREPAYMENT_CAP = 80

export const ACCEPTANCE_CHECKLIST_ITEMS = [
  { key: "completed_on_time", label: "Trabajo terminado en tiempo" },
  { key: "quality_as_expected", label: "Calidad esperada" },
  { key: "equipment_working", label: "Equipos funcionando" },
  { key: "no_observations", label: "Sin observaciones pendientes" },
  { key: "documentation_delivered", label: "Documentación / garantía entregada" },
] as const

export const PETTY_CASH_METHODS: readonly string[] = ["CAJA_CHICA"]
