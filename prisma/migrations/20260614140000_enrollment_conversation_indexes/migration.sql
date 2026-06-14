-- Indexes for enrollment lookups by course and conversation inbox ordering

CREATE INDEX "Enrollment_courseId_idx"
ON "AxelmondResearchLab"."Enrollment"("courseId");

CREATE INDEX "Conversation_updatedAt_idx"
ON "AxelmondResearchLab"."Conversation"("updatedAt");
