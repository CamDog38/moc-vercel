-- Create a backup of the fields column
ALTER TABLE "Form" ADD COLUMN "fields_backup" JSONB;
UPDATE "Form" SET "fields_backup" = "fields";

-- Add new columns
ALTER TABLE "Form" ADD COLUMN "sections" JSONB;
ALTER TABLE "Form" ADD COLUMN "isMultiPage" BOOLEAN NOT NULL DEFAULT false;

-- Update existing forms to have a default section
UPDATE "Form"
SET "sections" = jsonb_build_array(
  jsonb_build_object(
    'id', encode(gen_random_bytes(9), 'base64'),
    'title', 'Default Section',
    'fields', COALESCE("fields_backup", '[]'::jsonb)
  )
)
WHERE "sections" IS NULL;

-- Drop the backup column
ALTER TABLE "Form" DROP COLUMN "fields_backup";