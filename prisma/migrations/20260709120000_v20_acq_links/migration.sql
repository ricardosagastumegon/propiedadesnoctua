-- Varios links por tenant + intermediario
CREATE TABLE "AcquisitionLink" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Link',
  "brief" TEXT,
  "intermediaryOrgId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcquisitionLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcquisitionLink_token_key" ON "AcquisitionLink"("token");
CREATE INDEX "AcquisitionLink_organizationId_idx" ON "AcquisitionLink"("organizationId");
CREATE INDEX "AcquisitionLink_intermediaryOrgId_idx" ON "AcquisitionLink"("intermediaryOrgId");
ALTER TABLE "AcquisitionLink" ADD CONSTRAINT "AcquisitionLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcquisitionLink" ADD CONSTRAINT "AcquisitionLink_intermediaryOrgId_fkey" FOREIGN KEY ("intermediaryOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AcquisitionCandidate" ADD COLUMN "linkId" TEXT;
CREATE INDEX "AcquisitionCandidate_linkId_idx" ON "AcquisitionCandidate"("linkId");
ALTER TABLE "AcquisitionCandidate" ADD CONSTRAINT "AcquisitionCandidate_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "AcquisitionLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrar el token/brief actual (uno por org) a un AcquisitionLink
INSERT INTO "AcquisitionLink" ("id", "organizationId", "token", "name", "brief", "isActive", "createdAt")
SELECT gen_random_uuid()::text, "organizationId", "acquisitionToken", 'Link principal', "acquisitionBrief", true, CURRENT_TIMESTAMP
FROM "OrganizationSettings" WHERE "acquisitionToken" IS NOT NULL;

-- Ligar candidatas existentes al link de su org
UPDATE "AcquisitionCandidate" c SET "linkId" = l."id"
FROM "AcquisitionLink" l WHERE l."organizationId" = c."organizationId" AND c."linkId" IS NULL;
