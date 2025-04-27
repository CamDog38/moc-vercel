-- CreateTable
CREATE TABLE "FormSession" (
  "id" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'STARTED',
  "data" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "trackingToken" TEXT,
  "email" TEXT,
  "name" TEXT,
  "phone" TEXT,

  CONSTRAINT "FormSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormSession_formId_idx" ON "FormSession"("formId");

-- CreateIndex
CREATE INDEX "FormSession_status_idx" ON "FormSession"("status");

-- CreateIndex
CREATE INDEX "FormSession_email_idx" ON "FormSession"("email");

-- AddForeignKey
ALTER TABLE "FormSession" ADD CONSTRAINT "FormSession_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;