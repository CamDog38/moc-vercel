-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "officerId" TEXT;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "MarriageOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;