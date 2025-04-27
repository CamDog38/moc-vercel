-- Add formSystemType field to FormStyle table
ALTER TABLE "FormStyle" ADD COLUMN "formSystemType" TEXT NOT NULL DEFAULT 'BOTH';

-- Update existing records to use the default value
UPDATE "FormStyle" SET "formSystemType" = 'BOTH';

-- Comment explaining the field
COMMENT ON COLUMN "FormStyle"."formSystemType" IS 'Specifies which form system this style applies to: LEGACY, FORM2, or BOTH';
