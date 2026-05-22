// Single source of truth para magic strings del dominio.
// Usar estas constantes en código nuevo. Las strings literales sueltas existentes
// se irán reemplazando en refactors progresivos — no es necesario tocarlas todas
// de una sola pasada.

export const PAYMENT_MODES = {
  CAJA_CHICA: "CAJA_CHICA",
  PROVEEDOR: "PROVEEDOR",
  CONTADO: "CONTADO",
  EFECTIVO_RESPONSABLE: "EFECTIVO_RESPONSABLE",
  REEMBOLSO: "REEMBOLSO",
} as const
export type PaymentMode = typeof PAYMENT_MODES[keyof typeof PAYMENT_MODES]

export const PAYMENT_TYPES = {
  ADVANCE: "ADVANCE",
  PARTIAL: "PARTIAL",
  FINAL: "FINAL",
  CONTADO: "CONTADO",
} as const
export type PaymentType = typeof PAYMENT_TYPES[keyof typeof PAYMENT_TYPES]

export const PAYMENT_METHODS = {
  CAJA_CHICA: "CAJA_CHICA",
  TRANSFER: "TRANSFER",
  CASH: "CASH",
  CHECK: "CHECK",
  REIMBURSEMENT: "REIMBURSEMENT",
} as const
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

export const TICKET_STATUS = {
  REPORTED: "REPORTED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  ON_HOLD: "ON_HOLD",
} as const
export type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS]

export const PARTIDA_STATUS = {
  PENDING: "PENDING",
  QUOTING: "QUOTING",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  APPROVED: "APPROVED",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
  PAID: "PAID",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const
export type PartidaStatus = typeof PARTIDA_STATUS[keyof typeof PARTIDA_STATUS]

export const PROJECT_STATUS = {
  PLANNING: "PLANNING",
  IN_PROGRESS: "IN_PROGRESS",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const
export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]

export const QUOTE_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  SELECTED: "SELECTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const
export type QuoteStatus = typeof QUOTE_STATUS[keyof typeof QUOTE_STATUS]

export const APPROVAL_STATUS = {
  PENDING: "PENDING",
  PENDING_COSIGN: "PENDING_COSIGN",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const
export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS]

export const ACCEPTANCE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  SUPERSEDED: "SUPERSEDED",
} as const
export type AcceptanceStatus = typeof ACCEPTANCE_STATUS[keyof typeof ACCEPTANCE_STATUS]

export const ENTITY_TYPES = {
  PARTIDA: "PARTIDA",
  TICKET: "TICKET",
  PROJECT: "PROJECT",
  PAYMENT: "PAYMENT",
  QUOTE: "QUOTE",
  APPROVAL: "APPROVAL",
  CONTRACT: "CONTRACT",
  VENDOR: "VENDOR",
  VENDOR_INVOICE: "VENDOR_INVOICE",
  INVOICE_MODIFIED: "INVOICE_MODIFIED",
  PROJECT_PARTIDA: "PROJECT_PARTIDA",
  PETTY_CASH: "PETTY_CASH",
} as const
export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES]

export const AUTHORITY_POLICIES = {
  NONE: "NONE",
  ALONE: "ALONE",
  COSIGN_REQUIRED: "COSIGN_REQUIRED",
} as const
export type AuthorityPolicy = typeof AUTHORITY_POLICIES[keyof typeof AUTHORITY_POLICIES]

export const USER_ROLES = {
  ADMIN: "ADMIN",
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  SUPERVISOR: "SUPERVISOR",
  ASSISTANT: "ASSISTANT",
  VIEWER: "VIEWER",
} as const
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
