CREATE TYPE "StudentObjectiveRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

ALTER TABLE "StudentObjective"
ADD COLUMN "recurrence" "StudentObjectiveRecurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN "recurrenceSourceId" TEXT,
ADD COLUMN "recurrenceCreatedAt" TIMESTAMP(3);

CREATE INDEX "StudentObjective_studentId_recurrence_idx" ON "StudentObjective"("studentId", "recurrence");
CREATE INDEX "StudentObjective_studentId_recurrenceSourceId_idx" ON "StudentObjective"("studentId", "recurrenceSourceId");
