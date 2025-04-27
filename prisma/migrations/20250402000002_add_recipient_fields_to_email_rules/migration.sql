-- AlterTable
ALTER TABLE "EmailRule" ADD COLUMN "recipientType" TEXT,
ADD COLUMN "recipientEmail" TEXT,
ADD COLUMN "recipientField" TEXT;