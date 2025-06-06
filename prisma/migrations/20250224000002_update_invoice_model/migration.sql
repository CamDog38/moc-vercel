-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "marriageOfficerId" UUID REFERENCES "User"("id"),
    ADD COLUMN "serviceType" TEXT NOT NULL DEFAULT 'REGISTRATION_OFFICE',
    ADD COLUMN "serviceRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "travelCosts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;