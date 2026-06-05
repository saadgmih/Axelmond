CREATE TABLE "LiveAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "userId" TEXT,
    "role" "UserRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "participationScore" INTEGER NOT NULL DEFAULT 0,
    "handRaised" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveActionLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "roomName" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "UserRole",
    "action" TEXT NOT NULL,
    "targetIdentity" TEXT,
    "targetName" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveAttendance_sessionId_idx" ON "LiveAttendance"("sessionId");
CREATE INDEX "LiveAttendance_roomName_idx" ON "LiveAttendance"("roomName");
CREATE INDEX "LiveAttendance_userId_idx" ON "LiveAttendance"("userId");
CREATE INDEX "LiveAttendance_joinedAt_idx" ON "LiveAttendance"("joinedAt");
CREATE INDEX "LiveActionLog_sessionId_idx" ON "LiveActionLog"("sessionId");
CREATE INDEX "LiveActionLog_roomName_idx" ON "LiveActionLog"("roomName");
CREATE INDEX "LiveActionLog_actorId_idx" ON "LiveActionLog"("actorId");
CREATE INDEX "LiveActionLog_createdAt_idx" ON "LiveActionLog"("createdAt");

ALTER TABLE "LiveAttendance" ADD CONSTRAINT "LiveAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveAttendance" ADD CONSTRAINT "LiveAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveActionLog" ADD CONSTRAINT "LiveActionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveActionLog" ADD CONSTRAINT "LiveActionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
