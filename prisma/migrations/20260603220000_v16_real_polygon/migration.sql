-- Contorno real (medido en campo) por predio, además del legal (mapPolygon)
ALTER TABLE "PropertyParcel" ADD COLUMN "realPolygon" JSONB;
ALTER TABLE "PropertyParcel" ADD COLUMN "realAreaHectares" DOUBLE PRECISION;
