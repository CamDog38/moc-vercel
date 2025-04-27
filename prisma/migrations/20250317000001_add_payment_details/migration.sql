-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amountPaid" DECIMAL(10,2),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentDate" TIMESTAMP(3);