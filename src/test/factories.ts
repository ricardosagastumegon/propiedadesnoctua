// Test data factories. Pure object literals — no DB. Used with prismaMock arrange.
import type {
  Organization, User, Property, Project, ProjectPartida, Quote, QuoteItem,
  MaintenanceRequest, ServiceAcceptance, OrganizationSettings, ApprovalRequest,
  Vendor, PartidaPayment, TicketPayment,
} from "@prisma/client"

let _counter = 0
function id(prefix = "id"): string { return `${prefix}_${++_counter}` }

export function makeOrg(over: Partial<Organization> = {}): Organization {
  return {
    id: id("org"),
    name: "Org de Prueba",
    slug: "test-org",
    type: "FAMILY",
    taxId: null,
    logoUrl: null,
    currency: "GTQ",
    timezone: "America/Guatemala",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makeUser(over: Partial<User> = {}): User {
  return {
    id: id("user"),
    email: "user@test.gt",
    name: "Usuario Prueba",
    passwordHash: "hashed",
    emailVerified: null,
    image: null,
    role: "ADMIN",
    authorityPolicy: "ALONE",
    canAcceptServices: false,
    phone: null,
    organizationId: "org_default",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makeVendor(over: Partial<Vendor> = {}): Vendor {
  return {
    id: id("vendor"),
    organizationId: "org_default",
    name: "Vendor Prueba",
    type: "COMPANY",
    category: "OTHER",
    taxId: null,
    contactName: null,
    email: null,
    phone: "1234-5678",
    address: null,
    rating: null,
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makePartida(over: Partial<ProjectPartida> = {}): ProjectPartida {
  return {
    id: id("partida"),
    projectId: "proj_default",
    name: "Partida Prueba",
    description: null,
    budgetEstimate: null,
    status: "APPROVED",
    approvedQuoteId: null,
    vendorId: null,
    amountApproved: 10000,
    amountPaid: 0,
    deliveredAt: null,
    orderIndex: 0,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makePartidaPayment(over: Partial<PartidaPayment> = {}): PartidaPayment {
  return {
    id: id("ppay"),
    partidaId: "partida_default",
    amount: 1000,
    type: "PARTIAL",
    date: new Date(),
    method: "TRANSFER",
    reference: null,
    receiptUrl: null,
    notes: null,
    percentageOfTotal: null,
    closesWithDiscount: false,
    discountAmount: null,
    discountReason: null,
    createdAt: new Date(),
    ...over,
  }
}

export function makeTicket(over: Partial<MaintenanceRequest> = {}): MaintenanceRequest {
  return {
    id: id("ticket"),
    organizationId: "org_default",
    ticketNumber: "M-2026-T01",
    propertyId: "prop_default",
    assetId: null,
    category: "OTHER",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    title: "Ticket Prueba",
    description: "Descripción del ticket",
    reportedBy: null,
    reportedPhone: null,
    reportedAt: new Date(),
    assignedToId: null,
    assignedAt: null,
    startedAt: null,
    completedAt: null,
    estimatedCost: null,
    actualCost: null,
    resolutionNotes: null,
    paymentMode: "PROVEEDOR",
    vendorId: null,
    totalAmount: 10000,
    amountPaid: 0,
    escalatedToProjectId: null,
    escalatedAt: null,
    escalatedById: null,
    approvalRequestId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makeTicketPayment(over: Partial<TicketPayment> = {}): TicketPayment {
  return {
    id: id("tpay"),
    ticketId: "ticket_default",
    vendorId: null,
    amount: 1000,
    method: "TRANSFER",
    date: new Date(),
    reference: null,
    notes: null,
    percentageOfTotal: null,
    closesWithDiscount: false,
    discountAmount: null,
    discountReason: null,
    createdAt: new Date(),
    ...over,
  }
}

export function makeQuote(over: Partial<Quote> = {}): Quote {
  return {
    id: id("quote"),
    organizationId: "org_default",
    partidaId: null,
    ticketId: null,
    projectId: null,
    propertyId: null,
    vendorId: "vendor_default",
    quoteNumber: null,
    vendorReference: null,
    date: new Date(),
    validUntil: null,
    subtotal: 1000,
    taxAmount: 0,
    taxPercent: 12,
    total: 1000,
    currency: "GTQ",
    status: "PENDING",
    approvalRequestId: null,
    approvedAt: null,
    approvedBy: null,
    notes: null,
    documentUrl: null,
    pdfUrl: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makeAcceptance(over: Partial<ServiceAcceptance> = {}): ServiceAcceptance {
  return {
    id: id("accept"),
    organizationId: "org_default",
    entityType: "PARTIDA",
    entityId: "partida_default",
    projectId: "proj_default",
    status: "PENDING",
    version: 0,
    requestedById: "user_requester",
    acceptedById: null,
    rejectedById: null,
    requestedAt: new Date(),
    acceptedAt: null,
    rejectedAt: null,
    checklist: null,
    rating: null,
    notes: null,
    rejectionReason: null,
    requiredCorrections: null,
    verificationHash: null,
    contextSnapshot: JSON.stringify({
      entityType: "PARTIDA",
      entityId: "partida_default",
      entityName: "Partida Test",
      vendor: { id: "vendor_default", name: "Vendor Test" },
      amountApproved: 10000,
      amountPaid: 8000,
      approvedQuoteId: null,
      projectId: "proj_default",
      projectName: "Project Test",
      capturedAt: new Date().toISOString(),
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makeOrgSettings(over: Partial<OrganizationSettings> = {}): OrganizationSettings {
  return {
    organizationId: "org_default",
    prepaymentCapPercentage: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

export function makeApproval(over: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: id("approval"),
    organizationId: "org_default",
    entityType: "PROJECT_PARTIDA",
    entityId: "partida_default",
    requestedById: "user_requester",
    cosignerId: null,
    status: "PENDING",
    approvedById: null,
    rejectedById: null,
    approvedAt: null,
    rejectedAt: null,
    cosignedAt: null,
    rejectionReason: null,
    notes: null,
    title: null,
    amount: null,
    relatedId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}
