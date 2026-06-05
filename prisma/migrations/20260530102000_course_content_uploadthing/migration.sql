-- CreateEnum
CREATE TYPE "LessonContentType" AS ENUM ('VIDEO', 'PDF', 'IMAGE', 'TEXT');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('VIDEO', 'PDF', 'IMAGE', 'FILE');

-- AlterTable
CREATE SEQUENCE IF NOT EXISTS "Course_id_seq";
SELECT setval('"Course_id_seq"', COALESCE((SELECT MAX("id") FROM "Course"), 0) + 1, false);
ALTER TABLE "Course" ALTER COLUMN "id" SET DEFAULT nextval('"Course_id_seq"');
ALTER SEQUENCE "Course_id_seq" OWNED BY "Course"."id";
ALTER TABLE "Course" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ADD COLUMN "createdById" TEXT;

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSection" (
    "id" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "chapterId" TEXT,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonContent" (
    "id" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "sectionId" TEXT,
    "type" "LessonContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "contentId" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSection" ADD CONSTRAINT "ContentSection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSection" ADD CONSTRAINT "ContentSection_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSection" ADD CONSTRAINT "ContentSection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentSection" ADD CONSTRAINT "ContentSection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonContent" ADD CONSTRAINT "LessonContent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonContent" ADD CONSTRAINT "LessonContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ContentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonContent" ADD CONSTRAINT "LessonContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "LessonContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
