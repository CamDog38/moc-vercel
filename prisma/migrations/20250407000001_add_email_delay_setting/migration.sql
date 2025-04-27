-- Add email delay setting migration
-- This will be used to set a delay for email automation

-- No schema changes needed as we'll use the existing SystemSettings model

-- Insert default email delay setting (0 seconds by default)
INSERT INTO "SystemSettings" (id, key, value, description, "createdAt", "updatedAt")
VALUES (
  'cuid-email-delay-setting',
  'emailDelaySeconds',
  '0',
  'Delay in seconds before sending automated emails after form submission',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description = EXCLUDED.description, "updatedAt" = NOW();