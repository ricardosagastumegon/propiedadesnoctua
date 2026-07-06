-- Módulo Adquisiciones: token de link público + candidatas de compra
ALTER TABLE "OrganizationSettings" ADD COLUMN "acquisitionToken" TEXT;
CREATE UNIQUE INDEX "OrganizationSettings_acquisitionToken_key" ON "OrganizationSettings"("acquisitionToken");

CREATE TABLE "AcquisitionCandidate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "stage" TEXT NOT NULL DEFAULT 'NEW',
  "title" TEXT NOT NULL,
  "propertyType" TEXT,
  "department" TEXT,
  "city" TEXT,
  "zone" TEXT,
  "addressLine" TEXT,
  "price" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'GTQ',
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "area" DOUBLE PRECISION,
  "description" TEXT,
  "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "agentName" TEXT,
  "agentPhone" TEXT,
  "agentEmail" TEXT,
  "analysisNotes" TEXT,
  "estimatedValue" DOUBLE PRECISION,
  "offerAmount" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'PUBLIC_FORM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcquisitionCandidate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AcquisitionCandidate_organizationId_stage_idx" ON "AcquisitionCandidate"("organizationId", "stage");
ALTER TABLE "AcquisitionCandidate" ADD CONSTRAINT "AcquisitionCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
