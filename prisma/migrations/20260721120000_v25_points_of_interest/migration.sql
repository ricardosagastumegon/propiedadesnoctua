ALTER TABLE "OrganizationSettings" ADD COLUMN "poiEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PointOfInterest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "department" TEXT,
  "municipality" TEXT,
  "zone" TEXT,
  "address" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointOfInterest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PointOfInterest_organizationId_idx" ON "PointOfInterest"("organizationId");
ALTER TABLE "PointOfInterest" ADD CONSTRAINT "PointOfInterest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Habilitar para SION
UPDATE "OrganizationSettings" SET "poiEnabled" = true WHERE "organizationId" = 'cmpgxjg1400f27njcca38mjo8';
