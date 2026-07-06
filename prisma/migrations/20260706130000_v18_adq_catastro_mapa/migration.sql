-- Adquisiciones: catastro + ubicación/polígono para el mapa
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "cadastralNumber" TEXT;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "mapPolygon" JSONB;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "AcquisitionCandidate" ADD COLUMN "longitude" DOUBLE PRECISION;
