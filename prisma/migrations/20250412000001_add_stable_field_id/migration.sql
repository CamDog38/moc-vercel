-- Step 1: Add stableId as nullable and inUseByRules
ALTER TABLE "FormField" ADD COLUMN "stableId" TEXT,
ADD COLUMN "inUseByRules" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Populate stableId for existing records
UPDATE "FormField" SET "stableId" = gen_random_uuid()::text WHERE "stableId" IS NULL;

-- Step 3: Make stableId required and add unique constraint
ALTER TABLE "FormField" ALTER COLUMN "stableId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FormField_stableId_key" ON "FormField"("stableId");

-- CreateIndex
CREATE INDEX "FormField_stableId_idx" ON "FormField"("stableId");