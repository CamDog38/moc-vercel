-- Add tracking token field to FormSubmission
ALTER TABLE "FormSubmission" ADD COLUMN "trackingToken" TEXT;

-- Add sourceLeadId field to FormSubmission to track which lead generated this submission
ALTER TABLE "FormSubmission" ADD COLUMN "sourceLeadId" TEXT;

-- Create index on trackingToken for faster lookups
CREATE INDEX "FormSubmission_trackingToken_idx" ON "FormSubmission"("trackingToken");

-- Create index on sourceLeadId for faster lookups
CREATE INDEX "FormSubmission_sourceLeadId_idx" ON "FormSubmission"("sourceLeadId");