ALTER TABLE "OrganizationSettings" ADD COLUMN "fxUsdGtq" DOUBLE PRECISION NOT NULL DEFAULT 7.5;

CREATE TABLE "AcquisitionNegotiation" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GTQ',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcquisitionNegotiation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AcquisitionNegotiation_candidateId_idx" ON "AcquisitionNegotiation"("candidateId");
ALTER TABLE "AcquisitionNegotiation" ADD CONSTRAINT "AcquisitionNegotiation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AcquisitionCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
