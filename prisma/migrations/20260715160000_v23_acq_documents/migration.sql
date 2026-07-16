ALTER TABLE "AcquisitionCandidate" ADD COLUMN "documentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
