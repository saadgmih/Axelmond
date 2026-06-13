CREATE TABLE "ModuleProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModuleProgress_userId_courseId_moduleId_key" ON "ModuleProgress"("userId", "courseId", "moduleId");
CREATE INDEX "ModuleProgress_userId_courseId_idx" ON "ModuleProgress"("userId", "courseId");
CREATE INDEX "ModuleProgress_courseId_moduleId_idx" ON "ModuleProgress"("courseId", "moduleId");

ALTER TABLE "ModuleProgress"
ADD CONSTRAINT "ModuleProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModuleProgress"
ADD CONSTRAINT "ModuleProgress_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
