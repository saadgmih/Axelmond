-- Extend the existing payment ledger without altering historical PayPal rows.
ALTER TYPE "AxelmondResearchLab"."PaymentProvider" ADD VALUE IF NOT EXISTS 'CENTER';

CREATE TYPE "AxelmondResearchLab"."CenterPaymentStatus" AS ENUM (
  'PENDING_PAYMENT',
  'UNDER_REVIEW',
  'PAID',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE "AxelmondResearchLab"."CenterPaymentMethod" AS ENUM (
  'CASH',
  'CARD_AT_CENTER',
  'BANK_TRANSFER',
  'CHECK',
  'OTHER'
);

CREATE TYPE "AxelmondResearchLab"."CenterPaymentActorType" AS ENUM ('STUDENT', 'ADMIN', 'SYSTEM');

CREATE TABLE "AxelmondResearchLab"."CenterPaymentRequest" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "openRequestKey" TEXT,
  "userId" TEXT NOT NULL,
  "courseId" INTEGER NOT NULL,
  "amountMad" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MAD',
  "modulePriceSnapshot" DOUBLE PRECISION NOT NULL,
  "moduleTitleSnapshot" TEXT NOT NULL,
  "moduleDescriptionSnapshot" TEXT,
  "accessDurationDaysSnapshot" INTEGER NOT NULL,
  "hasAiAccessSnapshot" BOOLEAN NOT NULL DEFAULT false,
  "status" "AxelmondResearchLab"."CenterPaymentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "validatedAt" TIMESTAMP(3),
  "validatedByUserId" TEXT,
  "paymentMethod" "AxelmondResearchLab"."CenterPaymentMethod",
  "receivedAmountMad" DOUBLE PRECISION,
  "physicalReceiptReference" TEXT,
  "generatedReceiptNumber" TEXT,
  "studentNote" TEXT,
  "adminNote" TEXT,
  "publicReason" TEXT,
  "paymentId" TEXT,
  "enrollmentId" TEXT,
  "validationIdempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CenterPaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AxelmondResearchLab"."CenterPaymentStatusHistory" (
  "id" TEXT NOT NULL,
  "centerPaymentRequestId" TEXT NOT NULL,
  "previousStatus" "AxelmondResearchLab"."CenterPaymentStatus",
  "newStatus" "AxelmondResearchLab"."CenterPaymentStatus" NOT NULL,
  "changedByUserId" TEXT,
  "actorType" "AxelmondResearchLab"."CenterPaymentActorType" NOT NULL,
  "reason" TEXT,
  "publicReason" TEXT,
  "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CenterPaymentStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CenterPaymentRequest_publicReference_key"
ON "AxelmondResearchLab"."CenterPaymentRequest"("publicReference");
CREATE UNIQUE INDEX "CenterPaymentRequest_openRequestKey_key"
ON "AxelmondResearchLab"."CenterPaymentRequest"("openRequestKey");
CREATE UNIQUE INDEX "CenterPaymentRequest_generatedReceiptNumber_key"
ON "AxelmondResearchLab"."CenterPaymentRequest"("generatedReceiptNumber");
CREATE UNIQUE INDEX "CenterPaymentRequest_paymentId_key"
ON "AxelmondResearchLab"."CenterPaymentRequest"("paymentId");
CREATE UNIQUE INDEX "CenterPaymentRequest_validationIdempotencyKey_key"
ON "AxelmondResearchLab"."CenterPaymentRequest"("validationIdempotencyKey");
CREATE INDEX "CenterPaymentRequest_userId_idx"
ON "AxelmondResearchLab"."CenterPaymentRequest"("userId");
CREATE INDEX "CenterPaymentRequest_courseId_idx"
ON "AxelmondResearchLab"."CenterPaymentRequest"("courseId");
CREATE INDEX "CenterPaymentRequest_status_idx"
ON "AxelmondResearchLab"."CenterPaymentRequest"("status");
CREATE INDEX "CenterPaymentRequest_createdAt_idx"
ON "AxelmondResearchLab"."CenterPaymentRequest"("createdAt");
CREATE INDEX "CenterPaymentRequest_expiresAt_idx"
ON "AxelmondResearchLab"."CenterPaymentRequest"("expiresAt");
CREATE INDEX "CenterPaymentRequest_validatedByUserId_idx"
ON "AxelmondResearchLab"."CenterPaymentRequest"("validatedByUserId");
CREATE INDEX "CenterPaymentRequest_userId_courseId_status_idx"
ON "AxelmondResearchLab"."CenterPaymentRequest"("userId", "courseId", "status");
CREATE INDEX "CenterPaymentStatusHistory_centerPaymentRequestId_createdAt_idx"
ON "AxelmondResearchLab"."CenterPaymentStatusHistory"("centerPaymentRequestId", "createdAt");
CREATE INDEX "CenterPaymentStatusHistory_changedByUserId_idx"
ON "AxelmondResearchLab"."CenterPaymentStatusHistory"("changedByUserId");

ALTER TABLE "AxelmondResearchLab"."CenterPaymentRequest"
ADD CONSTRAINT "CenterPaymentRequest_userId_fkey" FOREIGN KEY ("userId")
REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."CenterPaymentRequest"
ADD CONSTRAINT "CenterPaymentRequest_courseId_fkey" FOREIGN KEY ("courseId")
REFERENCES "AxelmondResearchLab"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."CenterPaymentRequest"
ADD CONSTRAINT "CenterPaymentRequest_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId")
REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."CenterPaymentRequest"
ADD CONSTRAINT "CenterPaymentRequest_paymentId_fkey" FOREIGN KEY ("paymentId")
REFERENCES "AxelmondResearchLab"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."CenterPaymentRequest"
ADD CONSTRAINT "CenterPaymentRequest_enrollmentId_fkey" FOREIGN KEY ("enrollmentId")
REFERENCES "AxelmondResearchLab"."Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."CenterPaymentStatusHistory"
ADD CONSTRAINT "CenterPaymentStatusHistory_centerPaymentRequestId_fkey" FOREIGN KEY ("centerPaymentRequestId")
REFERENCES "AxelmondResearchLab"."CenterPaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."CenterPaymentStatusHistory"
ADD CONSTRAINT "CenterPaymentStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId")
REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
