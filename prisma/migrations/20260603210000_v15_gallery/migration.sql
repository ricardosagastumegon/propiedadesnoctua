-- Galería de fotos adicionales por propiedad (para fichas inmobiliarias)
ALTER TABLE "Property" ADD COLUMN "galleryUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
