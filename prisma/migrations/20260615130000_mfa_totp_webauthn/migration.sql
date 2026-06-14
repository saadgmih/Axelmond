-- MFA TOTP + WebAuthn passkeys (no external services)

ALTER TABLE "AxelmondResearchLab"."User"
  ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "totpSecretEnc" TEXT;

CREATE TABLE "AxelmondResearchLab"."TotpRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TotpRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AxelmondResearchLab"."WebAuthnCredential" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "credentialIdHash" TEXT NOT NULL,
  "publicKey" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" JSONB NOT NULL DEFAULT '[]',
  "deviceName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AxelmondResearchLab"."SecurityChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TotpRecoveryCode_userId_idx" ON "AxelmondResearchLab"."TotpRecoveryCode"("userId");
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "AxelmondResearchLab"."WebAuthnCredential"("credentialId");
CREATE UNIQUE INDEX "WebAuthnCredential_credentialIdHash_key" ON "AxelmondResearchLab"."WebAuthnCredential"("credentialIdHash");
CREATE INDEX "WebAuthnCredential_userId_idx" ON "AxelmondResearchLab"."WebAuthnCredential"("userId");
CREATE INDEX "SecurityChallenge_userId_idx" ON "AxelmondResearchLab"."SecurityChallenge"("userId");
CREATE INDEX "SecurityChallenge_expiresAt_idx" ON "AxelmondResearchLab"."SecurityChallenge"("expiresAt");

ALTER TABLE "AxelmondResearchLab"."TotpRecoveryCode"
  ADD CONSTRAINT "TotpRecoveryCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AxelmondResearchLab"."WebAuthnCredential"
  ADD CONSTRAINT "WebAuthnCredential_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AxelmondResearchLab"."SecurityChallenge"
  ADD CONSTRAINT "SecurityChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
