-- CreateEnum
CREATE TYPE "BackgroundJobType" AS ENUM ('FORM_DELETION', 'FORM_DUPLICATION');

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" "BackgroundJobType" NOT NULL,
    "status" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundJob_resourceId_idx" ON "BackgroundJob"("resourceId");