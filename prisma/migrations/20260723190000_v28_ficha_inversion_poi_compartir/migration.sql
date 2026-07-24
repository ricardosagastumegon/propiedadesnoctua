-- Ficha de inversión: datos comerciales/industriales de la propiedad candidata.
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "builtArea" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "parkingSpaces" INTEGER;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "frontM" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "depthM" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "maneuveringYardM2" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "officeMezzanineM2" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "clearHeightM" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "loadingDocks" INTEGER;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "pavedAccess" BOOLEAN;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "isIndustrial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "landUse" TEXT;

-- Puntos de interés compartibles entre tenants (igual que las propiedades).
ALTER TABLE "PointOfInterest" ADD COLUMN "sharedByOrgId" TEXT;
ALTER TABLE "PointOfInterest" ADD COLUMN "sourcePoiId" TEXT;

CREATE UNIQUE INDEX "PointOfInterest_organizationId_sourcePoiId_key" ON "PointOfInterest"("organizationId", "sourcePoiId");
CREATE INDEX "PointOfInterest_sharedByOrgId_idx" ON "PointOfInterest"("sharedByOrgId");
ALTER TABLE "PointOfInterest" ADD CONSTRAINT "PointOfInterest_sharedByOrgId_fkey" FOREIGN KEY ("sharedByOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
