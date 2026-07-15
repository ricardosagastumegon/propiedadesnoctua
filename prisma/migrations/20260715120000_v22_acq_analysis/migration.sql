ALTER TABLE "AcquisitionCandidate" ADD COLUMN "areaUnit" TEXT;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "cuerdaVaras" INTEGER;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "refPriceMinV2" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "refPriceMaxV2" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "isCommercial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "offerPerV2" DOUBLE PRECISION;
