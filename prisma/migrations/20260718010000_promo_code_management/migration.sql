-- Complete, non-destructive promotional-code workflow.
CREATE TYPE "AxelmondResearchLab"."PromoDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE "AxelmondResearchLab"."PromoAdministrativeStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'DISABLED', 'ARCHIVED');
CREATE TYPE "AxelmondResearchLab"."PromoEligibilityScope" AS ENUM ('ALL_STUDENTS', 'NEW_STUDENTS', 'EXISTING_STUDENTS', 'SELECTED_USERS', 'SELECTED_FILIERES');
CREATE TYPE "AxelmondResearchLab"."PromoUsageStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "AxelmondResearchLab"."PromoUsageProvider" AS ENUM ('PAYPAL', 'CENTER', 'FREE');

CREATE TABLE "AxelmondResearchLab"."PromoCode" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "internalName" TEXT NOT NULL,
  "publicDescription" TEXT,
  "internalDescription" TEXT,
  "discountType" "AxelmondResearchLab"."PromoDiscountType" NOT NULL,
  "discountValue" DECIMAL(12,2) NOT NULL,
  "maximumDiscountAmount" DECIMAL(12,2),
  "minimumPurchaseAmount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'MAD',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "relativeDuration" JSONB,
  "administrativeStatus" "AxelmondResearchLab"."PromoAdministrativeStatus" NOT NULL DEFAULT 'DRAFT',
  "appliesToAllModules" BOOLEAN NOT NULL DEFAULT false,
  "eligibilityScope" "AxelmondResearchLab"."PromoEligibilityScope" NOT NULL DEFAULT 'ALL_STUDENTS',
  "firstPurchaseOnly" BOOLEAN NOT NULL DEFAULT false,
  "maxTotalUses" INTEGER,
  "maxUsesPerUser" INTEGER,
  "totalReservedUses" INTEGER NOT NULL DEFAULT 0,
  "totalConfirmedUses" INTEGER NOT NULL DEFAULT 0,
  "stackable" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "disabledAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromoCode_discountValue_check" CHECK ("discountValue" > 0),
  CONSTRAINT "PromoCode_percentage_check" CHECK ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100),
  CONSTRAINT "PromoCode_dates_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "PromoCode_maxTotalUses_check" CHECK ("maxTotalUses" IS NULL OR "maxTotalUses" > 0),
  CONSTRAINT "PromoCode_maxUsesPerUser_check" CHECK ("maxUsesPerUser" IS NULL OR "maxUsesPerUser" > 0),
  CONSTRAINT "PromoCode_counters_check" CHECK ("totalReservedUses" >= 0 AND "totalConfirmedUses" >= 0)
);

CREATE TABLE "AxelmondResearchLab"."PromoCodeModule" (
  "promoCodeId" TEXT NOT NULL,
  "courseId" INTEGER NOT NULL,
  CONSTRAINT "PromoCodeModule_pkey" PRIMARY KEY ("promoCodeId", "courseId")
);

CREATE TABLE "AxelmondResearchLab"."PromoCodeEligibleUser" (
  "promoCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "PromoCodeEligibleUser_pkey" PRIMARY KEY ("promoCodeId", "userId")
);

CREATE TABLE "AxelmondResearchLab"."PromoCodeEligibleFiliere" (
  "promoCodeId" TEXT NOT NULL,
  "filiere" TEXT NOT NULL,
  CONSTRAINT "PromoCodeEligibleFiliere_pkey" PRIMARY KEY ("promoCodeId", "filiere")
);

CREATE TABLE "AxelmondResearchLab"."PromoCodeUsage" (
  "id" TEXT NOT NULL,
  "publicReference" TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" INTEGER NOT NULL,
  "paymentId" TEXT,
  "centerPaymentRequestId" TEXT,
  "provider" "AxelmondResearchLab"."PromoUsageProvider" NOT NULL,
  "status" "AxelmondResearchLab"."PromoUsageStatus" NOT NULL DEFAULT 'RESERVED',
  "externalReference" TEXT,
  "idempotencyKey" TEXT,
  "promoCodeSnapshot" TEXT NOT NULL,
  "discountTypeSnapshot" "AxelmondResearchLab"."PromoDiscountType" NOT NULL,
  "discountValueSnapshot" DECIMAL(12,2) NOT NULL,
  "maximumDiscountSnapshot" DECIMAL(12,2),
  "originalPriceSnapshot" DECIMAL(12,2) NOT NULL,
  "discountAmountSnapshot" DECIMAL(12,2) NOT NULL,
  "finalPriceSnapshot" DECIMAL(12,2) NOT NULL,
  "currencySnapshot" TEXT NOT NULL,
  "promoVersionSnapshot" INTEGER NOT NULL,
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoCodeUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromoCodeUsage_amounts_check" CHECK ("originalPriceSnapshot" >= 0 AND "discountAmountSnapshot" >= 0 AND "finalPriceSnapshot" >= 0),
  CONSTRAINT "PromoCodeUsage_discount_check" CHECK ("discountAmountSnapshot" <= "originalPriceSnapshot"),
  CONSTRAINT "PromoCodeUsage_final_check" CHECK ("finalPriceSnapshot" = "originalPriceSnapshot" - "discountAmountSnapshot")
);

CREATE TABLE "AxelmondResearchLab"."PromoCodeAuditLog" (
  "id" TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT,
  "previousValues" JSONB,
  "newValues" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromoCodeAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCode_publicId_key" ON "AxelmondResearchLab"."PromoCode"("publicId");
CREATE UNIQUE INDEX "PromoCode_code_key" ON "AxelmondResearchLab"."PromoCode"("code");
CREATE INDEX "PromoCode_administrativeStatus_idx" ON "AxelmondResearchLab"."PromoCode"("administrativeStatus");
CREATE INDEX "PromoCode_startsAt_idx" ON "AxelmondResearchLab"."PromoCode"("startsAt");
CREATE INDEX "PromoCode_endsAt_idx" ON "AxelmondResearchLab"."PromoCode"("endsAt");
CREATE INDEX "PromoCode_createdByUserId_idx" ON "AxelmondResearchLab"."PromoCode"("createdByUserId");
CREATE INDEX "PromoCode_discountType_idx" ON "AxelmondResearchLab"."PromoCode"("discountType");
CREATE INDEX "PromoCodeModule_courseId_idx" ON "AxelmondResearchLab"."PromoCodeModule"("courseId");
CREATE INDEX "PromoCodeEligibleUser_userId_idx" ON "AxelmondResearchLab"."PromoCodeEligibleUser"("userId");
CREATE INDEX "PromoCodeEligibleFiliere_filiere_idx" ON "AxelmondResearchLab"."PromoCodeEligibleFiliere"("filiere");
CREATE UNIQUE INDEX "PromoCodeUsage_publicReference_key" ON "AxelmondResearchLab"."PromoCodeUsage"("publicReference");
CREATE UNIQUE INDEX "PromoCodeUsage_paymentId_key" ON "AxelmondResearchLab"."PromoCodeUsage"("paymentId");
CREATE UNIQUE INDEX "PromoCodeUsage_centerPaymentRequestId_key" ON "AxelmondResearchLab"."PromoCodeUsage"("centerPaymentRequestId");
CREATE UNIQUE INDEX "PromoCodeUsage_externalReference_key" ON "AxelmondResearchLab"."PromoCodeUsage"("externalReference");
CREATE UNIQUE INDEX "PromoCodeUsage_idempotencyKey_key" ON "AxelmondResearchLab"."PromoCodeUsage"("idempotencyKey");
CREATE INDEX "PromoCodeUsage_promoCodeId_status_idx" ON "AxelmondResearchLab"."PromoCodeUsage"("promoCodeId", "status");
CREATE INDEX "PromoCodeUsage_userId_promoCodeId_status_idx" ON "AxelmondResearchLab"."PromoCodeUsage"("userId", "promoCodeId", "status");
CREATE INDEX "PromoCodeUsage_courseId_idx" ON "AxelmondResearchLab"."PromoCodeUsage"("courseId");
CREATE INDEX "PromoCodeUsage_status_expiresAt_idx" ON "AxelmondResearchLab"."PromoCodeUsage"("status", "expiresAt");
CREATE INDEX "PromoCodeUsage_provider_idx" ON "AxelmondResearchLab"."PromoCodeUsage"("provider");
CREATE INDEX "PromoCodeAuditLog_promoCodeId_createdAt_idx" ON "AxelmondResearchLab"."PromoCodeAuditLog"("promoCodeId", "createdAt");
CREATE INDEX "PromoCodeAuditLog_actorUserId_idx" ON "AxelmondResearchLab"."PromoCodeAuditLog"("actorUserId");

ALTER TABLE "AxelmondResearchLab"."PromoCode" ADD CONSTRAINT "PromoCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeModule" ADD CONSTRAINT "PromoCodeModule_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "AxelmondResearchLab"."PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeModule" ADD CONSTRAINT "PromoCodeModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AxelmondResearchLab"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeEligibleUser" ADD CONSTRAINT "PromoCodeEligibleUser_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "AxelmondResearchLab"."PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeEligibleUser" ADD CONSTRAINT "PromoCodeEligibleUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeEligibleFiliere" ADD CONSTRAINT "PromoCodeEligibleFiliere_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "AxelmondResearchLab"."PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "AxelmondResearchLab"."PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AxelmondResearchLab"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "AxelmondResearchLab"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_centerPaymentRequestId_fkey" FOREIGN KEY ("centerPaymentRequestId") REFERENCES "AxelmondResearchLab"."CenterPaymentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeAuditLog" ADD CONSTRAINT "PromoCodeAuditLog_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "AxelmondResearchLab"."PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AxelmondResearchLab"."PromoCodeAuditLog" ADD CONSTRAINT "PromoCodeAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
