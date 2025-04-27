-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('INQUIRY', 'BOOKING_CONFIRMATION', 'INVOICE', 'CUSTOM');

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "formId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "userId" UUID NOT NULL,
    "bookingId" TEXT,
    "invoiceId" TEXT,
    "formSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "Booking" ADD COLUMN "confirmationEmailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);

-- AddColumn
ALTER TABLE "Invoice" ADD COLUMN "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN "emailSentAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "userId" UUID;

-- CreateIndex
CREATE INDEX "EmailTemplate_userId_idx" ON "EmailTemplate"("userId");
CREATE INDEX "EmailRule_userId_idx" ON "EmailRule"("userId");
CREATE INDEX "EmailRule_templateId_idx" ON "EmailRule"("templateId");
CREATE INDEX "EmailRule_formId_idx" ON "EmailRule"("formId");
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");
CREATE INDEX "EmailLog_templateId_idx" ON "EmailLog"("templateId");
CREATE INDEX "EmailLog_bookingId_idx" ON "EmailLog"("bookingId");
CREATE INDEX "EmailLog_invoiceId_idx" ON "EmailLog"("invoiceId");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRule" ADD CONSTRAINT "EmailRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailRule" ADD CONSTRAINT "EmailRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailRule" ADD CONSTRAINT "EmailRule_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;