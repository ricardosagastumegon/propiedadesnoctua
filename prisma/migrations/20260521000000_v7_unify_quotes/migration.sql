
-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_partidaId_fkey";

-- DropForeignKey
ALTER TABLE "TicketQuote" DROP CONSTRAINT "TicketQuote_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketQuote" DROP CONSTRAINT "TicketQuote_vendorId_fkey";

-- DropIndex
DROP INDEX "Quote_organizationId_idx";

-- DropIndex
DROP INDEX "Quote_status_idx";

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "approvalRequestId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "taxPercent" DOUBLE PRECISION DEFAULT 12,
ADD COLUMN     "ticketId" TEXT,
ALTER COLUMN "quoteNumber" DROP NOT NULL,
ALTER COLUMN "date" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "TicketQuote";

-- CreateIndex
CREATE UNIQUE INDEX "Quote_approvalRequestId_key" ON "Quote"("approvalRequestId");

-- CreateIndex
CREATE INDEX "Quote_organizationId_status_idx" ON "Quote"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Quote_partidaId_idx" ON "Quote"("partidaId");

-- CreateIndex
CREATE INDEX "Quote_ticketId_idx" ON "Quote"("ticketId");

-- CreateIndex
CREATE INDEX "Quote_vendorId_idx" ON "Quote"("vendorId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "ProjectPartida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

