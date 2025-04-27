-- Add timeStamp field to FormSubmission table
ALTER TABLE "FormSubmission" ADD COLUMN "timeStamp" TEXT;

-- Create index for faster lookups
CREATE INDEX "FormSubmission_timeStamp_idx" ON "FormSubmission"("timeStamp");