-- CreateTable
CREATE TABLE "DebugLog" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebugLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebugLog_source_idx" ON "DebugLog"("source");

-- CreateIndex
CREATE INDEX "DebugLog_timestamp_idx" ON "DebugLog"("timestamp");