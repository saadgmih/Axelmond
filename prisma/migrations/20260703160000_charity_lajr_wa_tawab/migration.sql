-- CreateEnum
CREATE TYPE "AxelmondResearchLab"."DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "AxelmondResearchLab"."CharityAccessCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeSuffix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    "createdByAdminId" TEXT,

    CONSTRAINT "CharityAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AxelmondResearchLab"."CharityCodeUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharityCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AxelmondResearchLab"."CharityEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventDateTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Au centre Performance Académique',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AxelmondResearchLab"."DonationCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AxelmondResearchLab"."Donation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "AxelmondResearchLab"."DonationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharityAccessCode_codeHash_key" ON "AxelmondResearchLab"."CharityAccessCode"("codeHash");

-- CreateIndex
CREATE INDEX "CharityAccessCode_isActive_createdAt_idx" ON "AxelmondResearchLab"."CharityAccessCode"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CharityCodeUsage_userId_codeId_key" ON "AxelmondResearchLab"."CharityCodeUsage"("userId", "codeId");

-- CreateIndex
CREATE INDEX "CharityCodeUsage_codeId_usedAt_idx" ON "AxelmondResearchLab"."CharityCodeUsage"("codeId", "usedAt");

-- CreateIndex
CREATE INDEX "CharityEvent_isActive_eventDateTime_idx" ON "AxelmondResearchLab"."CharityEvent"("isActive", "eventDateTime");

-- CreateIndex
CREATE INDEX "DonationCampaign_isActive_createdAt_idx" ON "AxelmondResearchLab"."DonationCampaign"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_userId_createdAt_idx" ON "AxelmondResearchLab"."Donation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Donation_campaignId_status_idx" ON "AxelmondResearchLab"."Donation"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "AxelmondResearchLab"."CharityAccessCode" ADD CONSTRAINT "CharityAccessCode_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AxelmondResearchLab"."CharityCodeUsage" ADD CONSTRAINT "CharityCodeUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AxelmondResearchLab"."CharityCodeUsage" ADD CONSTRAINT "CharityCodeUsage_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "AxelmondResearchLab"."CharityAccessCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AxelmondResearchLab"."Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AxelmondResearchLab"."Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AxelmondResearchLab"."DonationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
