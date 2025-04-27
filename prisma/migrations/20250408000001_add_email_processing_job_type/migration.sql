-- Add EMAIL_PROCESSING to BackgroundJobType enum
ALTER TYPE "BackgroundJobType" ADD VALUE 'EMAIL_PROCESSING';

-- Update BackgroundJob table
ALTER TABLE "BackgroundJob" ALTER COLUMN "status" SET DEFAULT 'PENDING';