-- CreateTable
CREATE TABLE "MarriageOfficer" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarriageOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRate" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "travelRatePerKm" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarriageOfficer_userId_key" ON "MarriageOfficer"("userId");

-- AddForeignKey
ALTER TABLE "MarriageOfficer" ADD CONSTRAINT "MarriageOfficer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRate" ADD CONSTRAINT "ServiceRate_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "MarriageOfficer"("id") ON DELETE CASCADE ON UPDATE CASCADE;