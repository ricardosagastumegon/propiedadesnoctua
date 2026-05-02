/*
  Warnings:

  - You are about to drop the column `budgetSpent` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `budgetTotal` on the `Project` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "CosignPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CosignPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "cosignerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "cosignedAt" DATETIME,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "title" TEXT,
    "amount" REAL,
    "relatedId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_cosignerId_fkey" FOREIGN KEY ("cosignerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "fileUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketQuote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketQuote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "percentageOfTotal" REAL,
    "closesWithDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountAmount" REAL,
    "discountReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketPayment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceTimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceTimelineEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetRecordType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpiry" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetRecordType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "recordTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issueDate" DATETIME,
    "expiryDate" DATETIME,
    "fileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetRecord_recordTypeId_fkey" FOREIGN KEY ("recordTypeId") REFERENCES "AssetRecordType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectPartida" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budgetEstimate" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedQuoteId" TEXT,
    "vendorId" TEXT,
    "amountApproved" REAL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "deliveredAt" DATETIME,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectPartida_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectPartida_approvedQuoteId_fkey" FOREIGN KEY ("approvedQuoteId") REFERENCES "Quote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectPartida_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartidaPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partidaId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PARTIAL',
    "date" DATETIME NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "percentageOfTotal" REAL,
    "closesWithDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountAmount" REAL,
    "discountReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartidaPayment_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "ProjectPartida" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "propertyId" TEXT,
    "projectId" TEXT,
    "partidaId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "subtotal" REAL NOT NULL,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "notes" TEXT,
    "fileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorInvoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VendorInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VendorInvoice_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "ProjectPartida" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PettyCash" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "maxBalance" REAL NOT NULL DEFAULT 2000,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PettyCash_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PettyCash_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PettyCashMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pettyCashId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "date" DATETIME NOT NULL,
    "reference" TEXT,
    "ticketId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PettyCashMovement_pettyCashId_fkey" FOREIGN KEY ("pettyCashId") REFERENCES "PettyCash" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PettyCashMovement_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CosignAllowed" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CosignAllowed_A_fkey" FOREIGN KEY ("A") REFERENCES "CosignPolicy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CosignAllowed_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT,
    "number" TEXT NOT NULL,
    "satSerie" TEXT,
    "satNumber" TEXT,
    "satUuid" TEXT,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "subtotal" REAL NOT NULL,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isModified" BOOLEAN NOT NULL DEFAULT false,
    "modificationType" TEXT,
    "modificationAmount" REAL,
    "modificationReason" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("balance", "contractId", "createdAt", "currency", "dueDate", "id", "issueDate", "notes", "number", "organizationId", "paidAmount", "pdfUrl", "periodEnd", "periodStart", "satNumber", "satSerie", "satUuid", "status", "subtotal", "taxAmount", "total", "updatedAt") SELECT "balance", "contractId", "createdAt", "currency", "dueDate", "id", "issueDate", "notes", "number", "organizationId", "paidAmount", "pdfUrl", "periodEnd", "periodStart", "satNumber", "satSerie", "satUuid", "status", "subtotal", "taxAmount", "total", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_organizationId_number_idx" ON "Invoice"("organizationId", "number");
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");
CREATE TABLE "new_MaintenanceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" TEXT,
    "assignedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "estimatedCost" REAL,
    "actualCost" REAL,
    "resolutionNotes" TEXT,
    "paymentMode" TEXT,
    "vendorId" TEXT,
    "totalAmount" REAL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "escalatedToProjectId" TEXT,
    "escalatedAt" DATETIME,
    "escalatedById" TEXT,
    "approvalRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRequest_escalatedToProjectId_fkey" FOREIGN KEY ("escalatedToProjectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceRequest_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceRequest" ("actualCost", "assetId", "assignedAt", "assignedToId", "category", "completedAt", "createdAt", "description", "estimatedCost", "id", "organizationId", "priority", "propertyId", "reportedAt", "reportedBy", "reportedPhone", "resolutionNotes", "startedAt", "status", "ticketNumber", "title", "updatedAt") SELECT "actualCost", "assetId", "assignedAt", "assignedToId", "category", "completedAt", "createdAt", "description", "estimatedCost", "id", "organizationId", "priority", "propertyId", "reportedAt", "reportedBy", "reportedPhone", "resolutionNotes", "startedAt", "status", "ticketNumber", "title", "updatedAt" FROM "MaintenanceRequest";
DROP TABLE "MaintenanceRequest";
ALTER TABLE "new_MaintenanceRequest" RENAME TO "MaintenanceRequest";
CREATE UNIQUE INDEX "MaintenanceRequest_escalatedToProjectId_key" ON "MaintenanceRequest"("escalatedToProjectId");
CREATE UNIQUE INDEX "MaintenanceRequest_approvalRequestId_key" ON "MaintenanceRequest"("approvalRequestId");
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");
CREATE INDEX "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");
CREATE UNIQUE INDEX "MaintenanceRequest_organizationId_ticketNumber_key" ON "MaintenanceRequest"("organizationId", "ticketNumber");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "actualEndDate" DATETIME,
    "budgetEstimate" REAL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "coverImageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("actualEndDate", "coverImageUrl", "createdAt", "currency", "description", "endDate", "id", "name", "notes", "organizationId", "progressPercent", "propertyId", "startDate", "status", "type", "updatedAt") SELECT "actualEndDate", "coverImageUrl", "createdAt", "currency", "description", "endDate", "id", "name", "notes", "organizationId", "progressPercent", "propertyId", "startDate", "status", "type", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "latitude" REAL,
    "longitude" REAL,
    "totalArea" REAL,
    "builtArea" REAL,
    "bedrooms" INTEGER,
    "bathrooms" REAL,
    "parkingSpaces" INTEGER,
    "yearBuilt" INTEGER,
    "acquisitionDate" DATETIME,
    "acquisitionCost" REAL,
    "currentValue" REAL,
    "propertyTaxYear" REAL,
    "notes" TEXT,
    "coverImageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Property" ("acquisitionCost", "acquisitionDate", "addressLine", "alias", "bathrooms", "bedrooms", "builtArea", "city", "country", "coverImageUrl", "createdAt", "currentValue", "department", "id", "latitude", "longitude", "name", "notes", "organizationId", "parkingSpaces", "postalCode", "propertyTaxYear", "status", "totalArea", "type", "updatedAt", "yearBuilt", "zone") SELECT "acquisitionCost", "acquisitionDate", "addressLine", "alias", "bathrooms", "bedrooms", "builtArea", "city", "country", "coverImageUrl", "createdAt", "currentValue", "department", "id", "latitude", "longitude", "name", "notes", "organizationId", "parkingSpaces", "postalCode", "propertyTaxYear", "status", "totalArea", "type", "updatedAt", "yearBuilt", "zone" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE INDEX "Property_organizationId_idx" ON "Property"("organizationId");
CREATE INDEX "Property_status_idx" ON "Property"("status");
CREATE TABLE "new_Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "projectId" TEXT,
    "propertyId" TEXT,
    "partidaId" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "vendorReference" TEXT,
    "date" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "subtotal" REAL NOT NULL,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Quote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Quote_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "ProjectPartida" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Quote" ("approvedAt", "approvedBy", "createdAt", "currency", "date", "id", "notes", "organizationId", "pdfUrl", "projectId", "propertyId", "quoteNumber", "status", "subtotal", "taxAmount", "total", "updatedAt", "validUntil", "vendorId", "vendorReference") SELECT "approvedAt", "approvedBy", "createdAt", "currency", "date", "id", "notes", "organizationId", "pdfUrl", "projectId", "propertyId", "quoteNumber", "status", "subtotal", "taxAmount", "total", "updatedAt", "validUntil", "vendorId", "vendorReference" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
CREATE INDEX "Quote_organizationId_idx" ON "Quote"("organizationId");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "authorityPolicy" TEXT NOT NULL DEFAULT 'NONE',
    "phone" TEXT,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "isActive", "lastLoginAt", "name", "organizationId", "passwordHash", "phone", "role", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "isActive", "lastLoginAt", "name", "organizationId", "passwordHash", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CosignPolicy_userId_key" ON "CosignPolicy"("userId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_organizationId_status_idx" ON "ApprovalRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AssetRecordType_organizationId_idx" ON "AssetRecordType"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetRecordType_organizationId_code_key" ON "AssetRecordType"("organizationId", "code");

-- CreateIndex
CREATE INDEX "AssetRecord_assetId_idx" ON "AssetRecord"("assetId");

-- CreateIndex
CREATE INDEX "AssetRecord_expiryDate_idx" ON "AssetRecord"("expiryDate");

-- CreateIndex
CREATE INDEX "ProjectPartida_projectId_idx" ON "ProjectPartida"("projectId");

-- CreateIndex
CREATE INDEX "VendorInvoice_organizationId_idx" ON "VendorInvoice"("organizationId");

-- CreateIndex
CREATE INDEX "VendorInvoice_status_idx" ON "VendorInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PettyCash_propertyId_key" ON "PettyCash"("propertyId");

-- CreateIndex
CREATE INDEX "PettyCash_organizationId_idx" ON "PettyCash"("organizationId");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_projectId_idx" ON "ActivityLog"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "_CosignAllowed_AB_unique" ON "_CosignAllowed"("A", "B");

-- CreateIndex
CREATE INDEX "_CosignAllowed_B_index" ON "_CosignAllowed"("B");
