-- CreateTable
CREATE TABLE "Form2" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '2.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "submitButtonText" TEXT,
    "successMessage" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyFormId" TEXT,

    CONSTRAINT "Form2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSection2" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "formId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conditionalLogic" TEXT,

    CONSTRAINT "FormSection2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField2" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "sectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "config" TEXT NOT NULL,
    "validation" TEXT,
    "conditionalLogic" TEXT,
    "mapping" TEXT,
    "stableId" TEXT NOT NULL,
    "inUseByRules" BOOLEAN NOT NULL DEFAULT false,
    "legacyFieldId" TEXT,

    CONSTRAINT "FormField2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission2" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "metadata" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacySubmissionId" TEXT,

    CONSTRAINT "FormSubmission2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate2" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyTemplateId" TEXT,

    CONSTRAINT "EmailTemplate2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRule2" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientField" TEXT,
    "ccEmails" TEXT,
    "bccEmails" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legacyRuleId" TEXT,

    CONSTRAINT "EmailRule2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailProcessingLog2" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "formId" TEXT,
    "submissionId" TEXT,
    "ruleId" TEXT,
    "templateId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "details" TEXT,
    "error" TEXT,
    "stackTrace" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailProcessingLog2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailQueue2" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "cc" TEXT,
    "bcc" TEXT,
    "submissionId" TEXT,
    "formId" TEXT,
    "userId" TEXT,
    "ruleId" TEXT,
    "correlationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" TEXT,

    CONSTRAINT "EmailQueue2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog2" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "submissionId" TEXT,
    "formId" TEXT,
    "ruleId" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" TEXT,
    "ccRecipients" TEXT,
    "bccRecipients" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trackingId" TEXT,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent2" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT NOT NULL,
    "formId" TEXT,
    "formName" TEXT,
    "formType" TEXT,
    "fieldId" TEXT,
    "fieldName" TEXT,
    "sectionId" TEXT,
    "sectionName" TEXT,
    "submissionId" TEXT,
    "emailId" TEXT,
    "bookingId" TEXT,
    "value" TEXT,
    "metadata" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "duration" INTEGER,
    "previousEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAnalyticsSummary2" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "starts" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "abandonments" INTEGER NOT NULL DEFAULT 0,
    "averageCompletionTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormAnalyticsSummary2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAnalyticsSummary2" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "focuses" INTEGER NOT NULL DEFAULT 0,
    "blurs" INTEGER NOT NULL DEFAULT 0,
    "changes" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldAnalyticsSummary2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Form2_userId_idx" ON "Form2"("userId");

-- CreateIndex
CREATE INDEX "Form2_type_idx" ON "Form2"("type");

-- CreateIndex
CREATE INDEX "Form2_isActive_idx" ON "Form2"("isActive");

-- CreateIndex
CREATE INDEX "FormSection2_formId_idx" ON "FormSection2"("formId");

-- CreateIndex
CREATE INDEX "FormSection2_order_idx" ON "FormSection2"("order");

-- CreateIndex
CREATE INDEX "FormField2_sectionId_idx" ON "FormField2"("sectionId");

-- CreateIndex
CREATE INDEX "FormField2_order_idx" ON "FormField2"("order");

-- CreateIndex
CREATE INDEX "FormField2_type_idx" ON "FormField2"("type");

-- CreateIndex
CREATE INDEX "FormField2_stableId_idx" ON "FormField2"("stableId");

-- CreateIndex
CREATE UNIQUE INDEX "FormField2_stableId_key" ON "FormField2"("stableId");

-- CreateIndex
CREATE INDEX "FormSubmission2_formId_idx" ON "FormSubmission2"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission2_createdAt_idx" ON "FormSubmission2"("createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission2_status_idx" ON "FormSubmission2"("status");

-- CreateIndex
CREATE INDEX "EmailTemplate2_userId_idx" ON "EmailTemplate2"("userId");

-- CreateIndex
CREATE INDEX "EmailTemplate2_type_idx" ON "EmailTemplate2"("type");

-- CreateIndex
CREATE INDEX "EmailRule2_formId_idx" ON "EmailRule2"("formId");

-- CreateIndex
CREATE INDEX "EmailRule2_templateId_idx" ON "EmailRule2"("templateId");

-- CreateIndex
CREATE INDEX "EmailRule2_userId_idx" ON "EmailRule2"("userId");

-- CreateIndex
CREATE INDEX "EmailRule2_isActive_idx" ON "EmailRule2"("isActive");

-- CreateIndex
CREATE INDEX "EmailProcessingLog2_correlationId_idx" ON "EmailProcessingLog2"("correlationId");

-- CreateIndex
CREATE INDEX "EmailProcessingLog2_submissionId_idx" ON "EmailProcessingLog2"("submissionId");

-- CreateIndex
CREATE INDEX "EmailProcessingLog2_formId_idx" ON "EmailProcessingLog2"("formId");

-- CreateIndex
CREATE INDEX "EmailProcessingLog2_level_idx" ON "EmailProcessingLog2"("level");

-- CreateIndex
CREATE INDEX "EmailProcessingLog2_timestamp_idx" ON "EmailProcessingLog2"("timestamp");

-- CreateIndex
CREATE INDEX "EmailQueue2_status_idx" ON "EmailQueue2"("status");

-- CreateIndex
CREATE INDEX "EmailQueue2_correlationId_idx" ON "EmailQueue2"("correlationId");

-- CreateIndex
CREATE INDEX "EmailQueue2_createdAt_idx" ON "EmailQueue2"("createdAt");

-- CreateIndex
CREATE INDEX "EmailLog2_templateId_idx" ON "EmailLog2"("templateId");

-- CreateIndex
CREATE INDEX "EmailLog2_submissionId_idx" ON "EmailLog2"("submissionId");

-- CreateIndex
CREATE INDEX "EmailLog2_formId_idx" ON "EmailLog2"("formId");

-- CreateIndex
CREATE INDEX "EmailLog2_ruleId_idx" ON "EmailLog2"("ruleId");

-- CreateIndex
CREATE INDEX "EmailLog2_status_idx" ON "EmailLog2"("status");

-- CreateIndex
CREATE INDEX "EmailLog2_createdAt_idx" ON "EmailLog2"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog2_trackingId_key" ON "EmailLog2"("trackingId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent2_sessionId_idx" ON "AnalyticsEvent2"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent2_visitorId_idx" ON "AnalyticsEvent2"("visitorId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent2_formId_idx" ON "AnalyticsEvent2"("formId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent2_submissionId_idx" ON "AnalyticsEvent2"("submissionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent2_emailId_idx" ON "AnalyticsEvent2"("emailId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent2_type_idx" ON "AnalyticsEvent2"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent2_timestamp_idx" ON "AnalyticsEvent2"("timestamp");

-- CreateIndex
CREATE INDEX "FormAnalyticsSummary2_formId_idx" ON "FormAnalyticsSummary2"("formId");

-- CreateIndex
CREATE INDEX "FormAnalyticsSummary2_date_idx" ON "FormAnalyticsSummary2"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FormAnalyticsSummary2_formId_date_key" ON "FormAnalyticsSummary2"("formId", "date");

-- CreateIndex
CREATE INDEX "FieldAnalyticsSummary2_formId_idx" ON "FieldAnalyticsSummary2"("formId");

-- CreateIndex
CREATE INDEX "FieldAnalyticsSummary2_fieldId_idx" ON "FieldAnalyticsSummary2"("fieldId");

-- CreateIndex
CREATE INDEX "FieldAnalyticsSummary2_date_idx" ON "FieldAnalyticsSummary2"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FieldAnalyticsSummary2_formId_fieldId_date_key" ON "FieldAnalyticsSummary2"("formId", "fieldId", "date");

-- AddForeignKey
ALTER TABLE "FormSection2" ADD CONSTRAINT "FormSection2_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField2" ADD CONSTRAINT "FormField2_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission2" ADD CONSTRAINT "FormSubmission2_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRule2" ADD CONSTRAINT "EmailRule2_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRule2" ADD CONSTRAINT "EmailRule2_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog2" ADD CONSTRAINT "EmailLog2_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog2" ADD CONSTRAINT "EmailLog2_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog2" ADD CONSTRAINT "EmailLog2_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EmailRule2"("id") ON DELETE SET NULL ON UPDATE CASCADE;