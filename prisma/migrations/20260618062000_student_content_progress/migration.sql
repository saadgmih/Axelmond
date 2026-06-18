CREATE TABLE "StudentContentProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "moduleId" INTEGER,
    "contentKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentContentProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentContentProgress_userId_courseId_contentKey_key"
ON "StudentContentProgress"("userId", "courseId", "contentKey");

CREATE INDEX "StudentContentProgress_userId_courseId_idx"
ON "StudentContentProgress"("userId", "courseId");

CREATE INDEX "StudentContentProgress_courseId_contentKey_idx"
ON "StudentContentProgress"("courseId", "contentKey");

ALTER TABLE "StudentContentProgress"
ADD CONSTRAINT "StudentContentProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentContentProgress"
ADD CONSTRAINT "StudentContentProgress_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
