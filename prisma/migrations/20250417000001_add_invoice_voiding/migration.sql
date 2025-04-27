-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidComment" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "replacementInvoiceId" TEXT,
ADD COLUMN     "originalInvoiceId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_replacementInvoiceId_idx" ON "Invoice"("replacementInvoiceId");