-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TicketPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "vendorId" TEXT,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "percentageOfTotal" REAL,
    "closesWithDiscount" BOOLEAN NOT NULL DEFAULT false,
    "discountAmount" REAL,
    "discountReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketPayment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TicketPayment" ("amount", "closesWithDiscount", "createdAt", "date", "discountAmount", "discountReason", "id", "method", "notes", "percentageOfTotal", "reference", "ticketId") SELECT "amount", "closesWithDiscount", "createdAt", "date", "discountAmount", "discountReason", "id", "method", "notes", "percentageOfTotal", "reference", "ticketId" FROM "TicketPayment";
DROP TABLE "TicketPayment";
ALTER TABLE "new_TicketPayment" RENAME TO "TicketPayment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
