-- Catalogue, enrollment, and live session hot-path indexes

CREATE INDEX "Course_published_idx"
ON "AxelmondResearchLab"."Course"("published");

CREATE INDEX "Course_disciplineId_published_idx"
ON "AxelmondResearchLab"."Course"("disciplineId", "published");

CREATE INDEX "Enrollment_courseId_active_idx"
ON "AxelmondResearchLab"."Enrollment"("courseId", "active");

CREATE INDEX "LiveSession_courseId_isActive_idx"
ON "AxelmondResearchLab"."LiveSession"("courseId", "isActive");
