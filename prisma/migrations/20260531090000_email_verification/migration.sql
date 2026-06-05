ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;

CREATE TABLE "EmailVerificationCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailVerificationCode_userId_createdAt_idx" ON "EmailVerificationCode"("userId", "createdAt");

ALTER TABLE "EmailVerificationCode"
  ADD CONSTRAINT "EmailVerificationCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
