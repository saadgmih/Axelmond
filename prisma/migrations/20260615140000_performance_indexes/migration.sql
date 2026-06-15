-- Performance hot-path indexes (enrollment by user, refresh token cleanup, invite validation)

CREATE INDEX "Enrollment_userId_idx"
ON "AxelmondResearchLab"."Enrollment"("userId");

CREATE INDEX "Enrollment_userId_active_idx"
ON "AxelmondResearchLab"."Enrollment"("userId", "active");

CREATE INDEX "RefreshToken_userId_revokedAt_expiresAt_idx"
ON "AxelmondResearchLab"."RefreshToken"("userId", "revokedAt", "expiresAt");

CREATE INDEX "ProfessorInviteCode_usedAt_revokedAt_idx"
ON "AxelmondResearchLab"."ProfessorInviteCode"("usedAt", "revokedAt");
