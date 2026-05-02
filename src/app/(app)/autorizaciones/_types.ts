export type SerializedRequest = {
  id: string
  entityType: string
  entityId: string
  relatedId: string | null
  title: string | null
  amount: number | null
  status: string
  notes: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  cosignedAt: string | null
  requestedBy: { id: string; name: string }
  cosigner: { id: string; name: string } | null
  approvedBy: { id: string; name: string } | null
  rejectedBy: { id: string; name: string } | null
}

export type EntityData =
  | {
      type: "QUOTE"
      quoteNumber: string
      vendorId: string; vendorName: string; vendorPhone: string
      projectId: string | null; projectName: string | null
      propertyId: string | null; propertyName: string | null
      partidaId: string | null; partidaName: string | null
      validUntil: string | null
      total: number
    }
  | {
      type: "PARTIDA"
      projectId: string; projectName: string
      propertyId: string | null; propertyName: string | null
      vendorId: string | null; vendorName: string | null; vendorPhone: string | null
      budgetEstimate: number | null
      approvedQuoteNumber: string | null
    }
  | {
      type: "CONTRACT"
      propertyId: string; propertyName: string; propertyCity: string
      tenantId: string; tenantName: string; tenantPhone: string; tenantEmail: string | null
      startDate: string; endDate: string
      monthlyRent: number; deposit: number | null
    }
  | {
      type: "VENDOR_INVOICE"
      vendorId: string; vendorName: string; vendorPhone: string
      invoiceNumber: string; dueDate: string | null
      propertyId: string | null; propertyName: string | null
      projectId: string | null; projectName: string | null
      partidaId: string | null; partidaName: string | null
      total: number; balance: number
    }
  | {
      type: "INVOICE_MODIFIED"
      invoiceNumber: string; dueDate: string | null
      propertyId: string | null; propertyName: string | null
      tenantId: string | null; tenantName: string | null; tenantPhone: string | null
      modificationType: string | null
      modificationAmount: number | null
      modificationReason: string | null
      total: number
    }
  | {
      type: "VENDOR"
      vendorId: string; name: string; category: string
      contactName: string | null; phone: string; email: string | null
    }
  | {
      type: "PETTY_CASH"
      propertyId: string; propertyName: string; propertyCity: string
      balance: number; maxBalance: number; balanceAfter: number
    }
  | {
      type: "TICKET"
      ticketNumber: string
      propertyId: string; propertyName: string
      vendorId: string | null; vendorName: string | null; vendorPhone: string | null
      paymentMode: string | null; priority: string; category: string
    }
  | { type: "UNKNOWN" }
  | null

export type EnrichedItem = {
  request: SerializedRequest
  entity: EntityData
}
