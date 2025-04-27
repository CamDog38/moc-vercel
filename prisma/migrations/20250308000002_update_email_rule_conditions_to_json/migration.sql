-- Change the conditions field in EmailRule from String to Json
ALTER TABLE "EmailRule" ALTER COLUMN "conditions" TYPE JSONB USING conditions::jsonb;
ALTER TABLE "EmailRule" ALTER COLUMN "conditions" SET DEFAULT '{}'::jsonb;