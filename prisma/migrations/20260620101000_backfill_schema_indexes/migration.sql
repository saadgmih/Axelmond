CREATE INDEX IF NOT EXISTS "Attachment_courseId_idx" ON "Attachment"("courseId");
CREATE INDEX IF NOT EXISTS "Attachment_contentId_idx" ON "Attachment"("contentId");
CREATE INDEX IF NOT EXISTS "Attachment_createdById_idx" ON "Attachment"("createdById");

CREATE INDEX IF NOT EXISTS "Chapter_courseId_idx" ON "Chapter"("courseId");
CREATE INDEX IF NOT EXISTS "Chapter_createdById_idx" ON "Chapter"("createdById");

CREATE INDEX IF NOT EXISTS "ContentSection_courseId_idx" ON "ContentSection"("courseId");
CREATE INDEX IF NOT EXISTS "ContentSection_chapterId_idx" ON "ContentSection"("chapterId");
CREATE INDEX IF NOT EXISTS "ContentSection_parentId_idx" ON "ContentSection"("parentId");
CREATE INDEX IF NOT EXISTS "ContentSection_createdById_idx" ON "ContentSection"("createdById");

CREATE INDEX IF NOT EXISTS "Course_createdById_idx" ON "Course"("createdById");

CREATE INDEX IF NOT EXISTS "LessonContent_courseId_idx" ON "LessonContent"("courseId");
CREATE INDEX IF NOT EXISTS "LessonContent_sectionId_idx" ON "LessonContent"("sectionId");
CREATE INDEX IF NOT EXISTS "LessonContent_createdById_idx" ON "LessonContent"("createdById");

CREATE INDEX IF NOT EXISTS "LiveMessage_sessionId_idx" ON "LiveMessage"("sessionId");
CREATE INDEX IF NOT EXISTS "LiveMessage_userId_idx" ON "LiveMessage"("userId");

CREATE INDEX IF NOT EXISTS "LiveSession_courseId_idx" ON "LiveSession"("courseId");
CREATE INDEX IF NOT EXISTS "LiveSession_professorId_idx" ON "LiveSession"("professorId");
