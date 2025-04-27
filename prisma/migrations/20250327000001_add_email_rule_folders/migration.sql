-- AlterTable
ALTER TABLE "EmailRule" ADD COLUMN "folder" TEXT;

-- CreateIndex
CREATE INDEX "EmailRule_folder_idx" ON "EmailRule"("folder");