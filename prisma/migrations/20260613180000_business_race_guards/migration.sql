-- Conversation canonical key for direct messages
ALTER TABLE "AxelmondResearchLab"."Conversation"
ADD COLUMN IF NOT EXISTS "directKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_directKey_key"
ON "AxelmondResearchLab"."Conversation"("directKey");

-- Payment / Invoice tables for idempotent enrollments
CREATE TYPE "AxelmondResearchLab"."PaymentProvider" AS ENUM ('PAYPAL', 'MOCK');
CREATE TYPE "AxelmondResearchLab"."PaymentStatus" AS ENUM ('COMPLETED', 'REFUNDED');

CREATE TABLE "AxelmondResearchLab"."Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "provider" "AxelmondResearchLab"."PaymentProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "amountMad" DOUBLE PRECISION NOT NULL,
    "status" "AxelmondResearchLab"."PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AxelmondResearchLab"."Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "amountMad" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_provider_externalId_key"
ON "AxelmondResearchLab"."Payment"("provider", "externalId");

CREATE INDEX "Payment_userId_courseId_idx"
ON "AxelmondResearchLab"."Payment"("userId", "courseId");

CREATE UNIQUE INDEX "Invoice_paymentId_key"
ON "AxelmondResearchLab"."Invoice"("paymentId");

CREATE INDEX "Invoice_userId_issuedAt_idx"
ON "AxelmondResearchLab"."Invoice"("userId", "issuedAt");

ALTER TABLE "AxelmondResearchLab"."Payment"
ADD CONSTRAINT "Payment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AxelmondResearchLab"."Payment"
ADD CONSTRAINT "Payment_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "AxelmondResearchLab"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AxelmondResearchLab"."Invoice"
ADD CONSTRAINT "Invoice_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AxelmondResearchLab"."Invoice"
ADD CONSTRAINT "Invoice_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "AxelmondResearchLab"."Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One active attendance row per user per live session
CREATE UNIQUE INDEX "LiveAttendance_active_session_user_key"
ON "AxelmondResearchLab"."LiveAttendance"("sessionId", "userId")
WHERE "leftAt" IS NULL AND "userId" IS NOT NULL;
