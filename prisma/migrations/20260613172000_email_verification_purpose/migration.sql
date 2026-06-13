CREATE TYPE "EmailVerificationPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

ALTER TABLE "EmailVerificationCode"
ADD COLUMN "purpose" "EmailVerificationPurpose" NOT NULL DEFAULT 'EMAIL_VERIFY';

CREATE INDEX "EmailVerificationCode_userId_purpose_usedAt_createdAt_idx"
ON "EmailVerificationCode"("userId", "purpose", "usedAt", "createdAt");
