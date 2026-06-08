CREATE TYPE "ScheduleSessionType" AS ENUM ('COURS', 'TD', 'TP', 'LIVE', 'EXAMEN');

CREATE TABLE "ProfessorScheduleSession" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sessionType" "ScheduleSessionType" NOT NULL DEFAULT 'COURS',
    "roomOrLink" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessorScheduleSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfessorScheduleSession_professorId_dayOfWeek_idx" ON "ProfessorScheduleSession"("professorId", "dayOfWeek");

ALTER TABLE "ProfessorScheduleSession" ADD CONSTRAINT "ProfessorScheduleSession_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
