-- CreateTable
CREATE TABLE "FormStyle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cssContent" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "formId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormStyle_formId_idx" ON "FormStyle"("formId");

-- AddForeignKey
ALTER TABLE "FormStyle" ADD CONSTRAINT "FormStyle_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;