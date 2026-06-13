-- Composite indexes for hot live chat, attendance, and email verification queries

CREATE INDEX "LiveMessage_roomName_createdAt_idx"
ON "AxelmondResearchLab"."LiveMessage"("roomName", "createdAt");

DROP INDEX IF EXISTS "AxelmondResearchLab"."LiveMessage_roomName_idx";

CREATE INDEX "LiveAttendance_sessionId_userId_leftAt_idx"
ON "AxelmondResearchLab"."LiveAttendance"("sessionId", "userId", "leftAt");

CREATE INDEX "EmailVerificationCode_userId_usedAt_createdAt_idx"
ON "AxelmondResearchLab"."EmailVerificationCode"("userId", "usedAt", "createdAt");
