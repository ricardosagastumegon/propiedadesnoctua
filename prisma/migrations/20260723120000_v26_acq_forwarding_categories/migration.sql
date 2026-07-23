-- Adquisiciones: etiquetas (categorías), trazabilidad de origen y allowlist de reenvío ("Enviar a").

-- Nuevas columnas en AcquisitionCandidate
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "submittedByOrgId" TEXT;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "sourceCandidateId" TEXT;

CREATE UNIQUE INDEX "AcquisitionCandidate_organizationId_sourceCandidateId_key" ON "AcquisitionCandidate"("organizationId", "sourceCandidateId");
CREATE INDEX "AcquisitionCandidate_submittedByOrgId_idx" ON "AcquisitionCandidate"("submittedByOrgId");
ALTER TABLE "AcquisitionCandidate" ADD CONSTRAINT "AcquisitionCandidate_submittedByOrgId_fkey" FOREIGN KEY ("submittedByOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Allowlist de reenvío (sender -> receiver). La configura el super-admin.
CREATE TABLE "AcquisitionForwardPermission" (
  "id" TEXT NOT NULL,
  "senderOrgId" TEXT NOT NULL,
  "receiverOrgId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcquisitionForwardPermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcquisitionForwardPermission_senderOrgId_receiverOrgId_key" ON "AcquisitionForwardPermission"("senderOrgId", "receiverOrgId");
CREATE INDEX "AcquisitionForwardPermission_senderOrgId_idx" ON "AcquisitionForwardPermission"("senderOrgId");
CREATE INDEX "AcquisitionForwardPermission_receiverOrgId_idx" ON "AcquisitionForwardPermission"("receiverOrgId");
ALTER TABLE "AcquisitionForwardPermission" ADD CONSTRAINT "AcquisitionForwardPermission_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcquisitionForwardPermission" ADD CONSTRAINT "AcquisitionForwardPermission_receiverOrgId_fkey" FOREIGN KEY ("receiverOrgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
