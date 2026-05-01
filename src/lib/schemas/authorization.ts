export const AUTHORITY_POLICIES: Record<string, string> = {
  NONE: "Sin autoridad de firma",
  ALONE: "Puede actuar solo",
  COSIGN_REQUIRED: "Requiere co-firma",
}

export const APPROVAL_STATUSES: Record<string, string> = {
  PENDING: "Pendiente",
  PENDING_COSIGN: "Pendiente co-firma",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
}

export const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-800",
  PENDING_COSIGN: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
}

export const ENTITY_TYPES: Record<string, string> = {
  QUOTE: "Cotización",
  CONTRACT: "Contrato",
  VENDOR_INVOICE: "Factura proveedor",
  INVOICE_MODIFIED: "Factura modificada",
  VENDOR: "Proveedor",
  PARTIDA: "Partida de proyecto",
  PROJECT_PARTIDA: "Cotización de partida",
}

export const USER_ROLES: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  SUPERVISOR: "Supervisor",
  ASSISTANT: "Asistente",
  VIEWER: "Visualizador",
}

export const PARTIDA_STATUSES: Record<string, string> = {
  PENDING: "Pendiente",
  QUOTING: "Cotizando",
  APPROVED: "Aprobada",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
}

export const PARTIDA_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  QUOTING: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-100 text-red-700",
}

export const VENDOR_INVOICE_STATUSES: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  PAID: "Pagada",
  REJECTED: "Rechazada",
}

export const VENDOR_INVOICE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-800",
  APPROVED: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
}
