-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN "folder" TEXT;

-- CreateIndex
CREATE INDEX "EmailTemplate_folder_idx" ON "EmailTemplate"("folder");