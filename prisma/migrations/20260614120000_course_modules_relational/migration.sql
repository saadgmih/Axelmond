-- CreateTable
CREATE TABLE "AxelmondResearchLab"."CourseModule" (
    "courseId" INTEGER NOT NULL,
    "id" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" TEXT NOT NULL DEFAULT '',
    "contentMarkdown" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "sectionId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("courseId","id")
);

-- CreateIndex
CREATE INDEX "CourseModule_courseId_sortOrder_idx" ON "AxelmondResearchLab"."CourseModule"("courseId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AxelmondResearchLab"."CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "AxelmondResearchLab"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
