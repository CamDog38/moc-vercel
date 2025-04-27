-- CreateEnum
CREATE TYPE "PdfTemplateType" AS ENUM ('INVOICE', 'BOOKING', 'CERTIFICATE');

-- CreateTable
CREATE TABLE "PdfTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PdfTemplateType" NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "cssContent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfTemplate_pkey" PRIMARY KEY ("id")
);