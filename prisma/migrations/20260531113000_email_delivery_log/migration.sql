CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "purpose" TEXT NOT NULL,
    "recipientDomain" TEXT NOT NULL,
    "smtp" JSONB NOT NULL,
    "messageId" TEXT,
    "accepted" JSONB NOT NULL,
    "rejected" JSONB NOT NULL,
    "envelope" JSONB,
    "response" TEXT,
    "providerStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDeliveryLog_userId_createdAt_idx" ON "EmailDeliveryLog"("userId", "createdAt");

ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
