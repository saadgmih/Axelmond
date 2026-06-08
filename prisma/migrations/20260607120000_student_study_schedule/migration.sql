CREATE TYPE "StudentStudySessionType" AS ENUM ('REVISION', 'COURS', 'TD', 'TP', 'LIVE', 'DEVOIR', 'EXAMEN');

CREATE TABLE "StudentStudyScheduleSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sessionType" "StudentStudySessionType" NOT NULL DEFAULT 'REVISION',
    "roomOrLink" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentStudyScheduleSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentStudyScheduleSession_studentId_dayOfWeek_idx" ON "StudentStudyScheduleSession"("studentId", "dayOfWeek");

ALTER TABLE "StudentStudyScheduleSession" ADD CONSTRAINT "StudentStudyScheduleSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
