-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "parcelId" TEXT;

-- CreateTable
CREATE TABLE "PropertyParcel" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT,
    "cadastralNumber" TEXT,
    "mapPolygon" JSONB,
    "areaHectares" DOUBLE PRECISION,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyParcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyParcel_propertyId_idx" ON "PropertyParcel"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyParcel" ADD CONSTRAINT "PropertyParcel_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "PropertyParcel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
