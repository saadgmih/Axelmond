CREATE TYPE "StudentObjectiveStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

CREATE TYPE "StudentObjectiveType" AS ENUM ('CHAPITRE', 'TD', 'RESUME', 'REVISION', 'AUTRE');

CREATE TYPE "FocusContentType" AS ENUM ('PODCAST', 'VIDEO', 'AUDIO_REMINDER', 'EDUCATIONAL_RESOURCE', 'OTHER');

CREATE TABLE "StudentObjective" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "StudentObjectiveStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "objectiveType" "StudentObjectiveType",
    "focusContentTitle" TEXT,
    "focusContentUrl" TEXT,
    "focusContentType" "FocusContentType",
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentObjective_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentObjective_studentId_status_idx" ON "StudentObjective"("studentId", "status");
CREATE INDEX "StudentObjective_studentId_startAt_idx" ON "StudentObjective"("studentId", "startAt");
CREATE INDEX "StudentObjective_studentId_endAt_idx" ON "StudentObjective"("studentId", "endAt");

ALTER TABLE "StudentObjective" ADD CONSTRAINT "StudentObjective_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
