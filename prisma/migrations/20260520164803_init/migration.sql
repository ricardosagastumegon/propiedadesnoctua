-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FAMILY',
    "taxId" TEXT,
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "timezone" TEXT NOT NULL DEFAULT 'America/Guatemala',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "organizationId" TEXT NOT NULL,
    "prepaymentCapPercentage" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "authorityPolicy" TEXT NOT NULL DEFAULT 'NONE',
    "canAcceptServices" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAcceptance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "rejectedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "checklist" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "requiredCorrections" TEXT,
    "verificationHash" TEXT,
    "contextSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAcceptancePhoto" (
    "id" TEXT NOT NULL,
    "acceptanceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceAcceptancePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosignPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CosignPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "cosignerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cosignedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "title" TEXT,
    "amount" DOUBLE PRECISION,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "addressLine" TEXT NOT NULL,
    "zone" TEXT,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Guatemala',
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "totalArea" DOUBLE PRECISION,
    "builtArea" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "parkingSpaces" INTEGER,
    "yearBuilt" INTEGER,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "propertyTaxYear" DOUBLE PRECISION,
    "notes" TEXT,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyUnit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "PropertyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "fullName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "occupation" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "tenantId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyRent" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "deposit" DOUBLE PRECISION,
    "paymentDueDay" INTEGER NOT NULL,
    "paymentFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "includesUtilities" BOOLEAN NOT NULL DEFAULT false,
    "utilitiesNotes" TEXT,
    "lateFeePercent" DOUBLE PRECISION,
    "annualIncrease" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT,
    "number" TEXT NOT NULL,
    "satSerie" TEXT,
    "satNumber" TEXT,
    "satUuid" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isModified" BOOLEAN NOT NULL DEFAULT false,
    "modificationType" TEXT,
    "modificationAmount" DOUBLE PRECISION,
    "modificationReason" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT,
    "invoiceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "bankName" TEXT,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "projectId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "vendorId" TEXT,
    "invoiceRef" TEXT,
    "receiptUrl" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityAccount" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "meterNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "UtilityAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityBill" (
    "id" TEXT NOT NULL,
    "utilityAccountId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "consumption" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "receiptUrl" TEXT,

    CONSTRAINT "UtilityBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "assetId" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedBy" TEXT,
    "reportedPhone" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "resolutionNotes" TEXT,
    "paymentMode" TEXT,
    "vendorId" TEXT,
    "totalAmount" DOUBLE PRECISION,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escalatedToProjectId" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalatedById" TEXT,
    "approvalRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePhoto" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isAfter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenancePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketQuote" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fileUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPayment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "vendorId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "percentageOfTotal" DOUBLE PRECISION,
    "closesWithDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountAmount" DOUBLE PRECISION,
    "discountReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTimelineEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "warranty" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetServiceLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "performedBy" TEXT,
    "nextServiceAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "AssetServiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRecordType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetRecordType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetRecord" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "recordTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "budgetEstimate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProjectCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPartida" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budgetEstimate" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedQuoteId" TEXT,
    "vendorId" TEXT,
    "amountApproved" DOUBLE PRECISION,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPartida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaPayment" (
    "id" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PARTIAL',
    "date" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "percentageOfTotal" DOUBLE PRECISION,
    "closesWithDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountAmount" DOUBLE PRECISION,
    "discountReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartidaPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COMPANY',
    "category" TEXT NOT NULL,
    "taxId" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "rating" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "projectId" TEXT,
    "propertyId" TEXT,
    "partidaId" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "vendorReference" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "propertyId" TEXT,
    "projectId" TEXT,
    "partidaId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "payPeriod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "payRate" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "projectId" TEXT,
    "propertyId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "amountPaid" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "EmployeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "propertyId" TEXT,
    "contractId" TEXT,
    "projectId" TEXT,
    "uploadedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "modelUrl" TEXT,
    "modelStatus" TEXT,
    "aiAnalysis" TEXT,
    "scale" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCash" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxBalance" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashMovement" (
    "id" TEXT NOT NULL,
    "pettyCashId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "ticketId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PettyCashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CosignAllowed" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CosignAllowed_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceAcceptance_organizationId_status_idx" ON "ServiceAcceptance"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ServiceAcceptance_entityType_entityId_idx" ON "ServiceAcceptance"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ServiceAcceptance_projectId_idx" ON "ServiceAcceptance"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CosignPolicy_userId_key" ON "CosignPolicy"("userId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_organizationId_status_idx" ON "ApprovalRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Property_organizationId_idx" ON "Property"("organizationId");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyUnit_propertyId_unitNumber_key" ON "PropertyUnit"("propertyId", "unitNumber");

-- CreateIndex
CREATE INDEX "Tenant_organizationId_idx" ON "Tenant"("organizationId");

-- CreateIndex
CREATE INDEX "Tenant_documentNumber_idx" ON "Tenant"("documentNumber");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_organizationId_contractNumber_key" ON "Contract"("organizationId", "contractNumber");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_number_idx" ON "Invoice"("organizationId", "number");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Payment_organizationId_paymentDate_idx" ON "Payment"("organizationId", "paymentDate");

-- CreateIndex
CREATE INDEX "Expense_organizationId_date_idx" ON "Expense"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequest_escalatedToProjectId_key" ON "MaintenanceRequest"("escalatedToProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequest_approvalRequestId_key" ON "MaintenanceRequest"("approvalRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRequest_organizationId_ticketNumber_key" ON "MaintenanceRequest"("organizationId", "ticketNumber");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "AssetRecordType_organizationId_idx" ON "AssetRecordType"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRecordType_organizationId_code_key" ON "AssetRecordType"("organizationId", "code");

-- CreateIndex
CREATE INDEX "AssetRecord_assetId_idx" ON "AssetRecord"("assetId");

-- CreateIndex
CREATE INDEX "AssetRecord_expiryDate_idx" ON "AssetRecord"("expiryDate");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectPartida_projectId_idx" ON "ProjectPartida"("projectId");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- CreateIndex
CREATE INDEX "Quote_organizationId_idx" ON "Quote"("organizationId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "VendorInvoice_organizationId_idx" ON "VendorInvoice"("organizationId");

-- CreateIndex
CREATE INDEX "VendorInvoice_status_idx" ON "VendorInvoice"("status");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCash_propertyId_key" ON "PettyCash"("propertyId");

-- CreateIndex
CREATE INDEX "PettyCash_organizationId_idx" ON "PettyCash"("organizationId");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_projectId_idx" ON "ActivityLog"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "_CosignAllowed_B_index" ON "_CosignAllowed"("B");

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAcceptance" ADD CONSTRAINT "ServiceAcceptance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAcceptance" ADD CONSTRAINT "ServiceAcceptance_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAcceptance" ADD CONSTRAINT "ServiceAcceptance_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAcceptance" ADD CONSTRAINT "ServiceAcceptance_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAcceptancePhoto" ADD CONSTRAINT "ServiceAcceptancePhoto_acceptanceId_fkey" FOREIGN KEY ("acceptanceId") REFERENCES "ServiceAcceptance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosignPolicy" ADD CONSTRAINT "CosignPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_cosignerId_fkey" FOREIGN KEY ("cosignerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyUnit" ADD CONSTRAINT "PropertyUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "PropertyUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityAccount" ADD CONSTRAINT "UtilityAccount_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityBill" ADD CONSTRAINT "UtilityBill_utilityAccountId_fkey" FOREIGN KEY ("utilityAccountId") REFERENCES "UtilityAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_escalatedToProjectId_fkey" FOREIGN KEY ("escalatedToProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePhoto" ADD CONSTRAINT "MaintenancePhoto_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketQuote" ADD CONSTRAINT "TicketQuote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketQuote" ADD CONSTRAINT "TicketQuote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPayment" ADD CONSTRAINT "TicketPayment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPayment" ADD CONSTRAINT "TicketPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTimelineEvent" ADD CONSTRAINT "MaintenanceTimelineEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetServiceLog" ADD CONSTRAINT "AssetServiceLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRecordType" ADD CONSTRAINT "AssetRecordType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRecord" ADD CONSTRAINT "AssetRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRecord" ADD CONSTRAINT "AssetRecord_recordTypeId_fkey" FOREIGN KEY ("recordTypeId") REFERENCES "AssetRecordType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCost" ADD CONSTRAINT "ProjectCost_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartida" ADD CONSTRAINT "ProjectPartida_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartida" ADD CONSTRAINT "ProjectPartida_approvedQuoteId_fkey" FOREIGN KEY ("approvedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartida" ADD CONSTRAINT "ProjectPartida_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPayment" ADD CONSTRAINT "PartidaPayment_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "ProjectPartida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "ProjectPartida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "ProjectPartida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCash" ADD CONSTRAINT "PettyCash_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCash" ADD CONSTRAINT "PettyCash_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashMovement" ADD CONSTRAINT "PettyCashMovement_pettyCashId_fkey" FOREIGN KEY ("pettyCashId") REFERENCES "PettyCash"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashMovement" ADD CONSTRAINT "PettyCashMovement_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CosignAllowed" ADD CONSTRAINT "_CosignAllowed_A_fkey" FOREIGN KEY ("A") REFERENCES "CosignPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CosignAllowed" ADD CONSTRAINT "_CosignAllowed_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
