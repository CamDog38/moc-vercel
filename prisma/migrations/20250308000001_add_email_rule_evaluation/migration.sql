-- CreateTable
CREATE TABLE "EmailRuleEvaluation" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "formSubmissionId" TEXT NOT NULL,
    "matched" BOOLEAN NOT NULL,
    "conditionResults" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailRuleEvaluation_pkey" PRIMARY KEY ("id")
);

-- AddIndex
CREATE INDEX "EmailRuleEvaluation_ruleId_idx" ON "EmailRuleEvaluation"("ruleId");
CREATE INDEX "EmailRuleEvaluation_formSubmissionId_idx" ON "EmailRuleEvaluation"("formSubmissionId");

-- AddForeignKey
ALTER TABLE "EmailRuleEvaluation" ADD CONSTRAINT "EmailRuleEvaluation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EmailRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailRuleEvaluation" ADD CONSTRAINT "EmailRuleEvaluation_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;