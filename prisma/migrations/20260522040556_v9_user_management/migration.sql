-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "UserPropertyAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPropertyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPropertyAccess_userId_idx" ON "UserPropertyAccess"("userId");

-- CreateIndex
CREATE INDEX "UserPropertyAccess_propertyId_idx" ON "UserPropertyAccess"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPropertyAccess_userId_propertyId_key" ON "UserPropertyAccess"("userId", "propertyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPropertyAccess" ADD CONSTRAINT "UserPropertyAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPropertyAccess" ADD CONSTRAINT "UserPropertyAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
