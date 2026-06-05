DROP INDEX IF EXISTS "Quiz_courseId_moduleId_key";

ALTER TABLE "Quiz"
ALTER COLUMN "moduleId" DROP NOT NULL,
ADD COLUMN "sectionId" TEXT,
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "QuizAttempt"
ALTER COLUMN "moduleId" DROP NOT NULL;

UPDATE "Quiz"
SET "published" = true
WHERE "moduleId" IS NOT NULL;

CREATE INDEX "Quiz_courseId_moduleId_idx" ON "Quiz"("courseId", "moduleId");
CREATE INDEX "Quiz_sectionId_idx" ON "Quiz"("sectionId");

ALTER TABLE "Quiz"
ADD CONSTRAINT "Quiz_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "ContentSection"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
