-- Create a new table for invoice payments
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lineItemId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- Add balanceDue field to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "balanceDue" DECIMAL(10,2);

-- Create indexes
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");
CREATE INDEX "InvoicePayment_lineItemId_idx" ON "InvoicePayment"("lineItemId");

-- Add foreign key constraints
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "InvoiceLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;