-- Add initials field to MarriageOfficer table
ALTER TABLE "MarriageOfficer" ADD COLUMN "initials" TEXT;

-- Create a new table for system settings
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique index on key
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- Add lastInvoiceNumber field to track the last used invoice number
INSERT INTO "SystemSettings" ("id", "key", "value", "description", "createdAt", "updatedAt")
VALUES 
    ('cls-invoice-number', 'lastInvoiceNumber', '1000', 'The last used invoice number for auto-increment', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);