-- Baseline du pipeline vidéo (video-branding) : ces objets existaient dans
-- schema.prisma et avaient été appliqués hors migration (db push). Cette
-- migration les rattrape de façon idempotente : elle ne fait rien si les
-- objets existent déjà (production), et les crée sur une base neuve (CI).

-- CreateEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'AxelmondResearchLab' AND t.typname = 'LessonContentStatus'
  ) THEN
    CREATE TYPE "AxelmondResearchLab"."LessonContentStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED', 'FAILED');
  END IF;
END
$$;

-- CreateEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'AxelmondResearchLab' AND t.typname = 'VideoJobStatus'
  ) THEN
    CREATE TYPE "AxelmondResearchLab"."VideoJobStatus" AS ENUM ('UPLOADED', 'QUEUED', 'VALIDATING', 'PROBING', 'NORMALIZING', 'ADDING_INTRO', 'ENCODING', 'VERIFYING', 'READY', 'FAILED', 'CANCELLED');
  END IF;
END
$$;

-- AlterTable (idempotent)
ALTER TABLE "AxelmondResearchLab"."LessonContent" ADD COLUMN IF NOT EXISTS "status" "AxelmondResearchLab"."LessonContentStatus" NOT NULL DEFAULT 'READY';

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "AxelmondResearchLab"."VideoProcessingJob" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "sourceVideoPath" TEXT NOT NULL,
    "outputVideoPath" TEXT,
    "introVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "AxelmondResearchLab"."VideoJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "sourceDuration" DOUBLE PRECISION,
    "outputDuration" DOUBLE PRECISION,
    "sourceSizeBytes" INTEGER,
    "outputSizeBytes" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "VideoProcessingJob_contentId_key" ON "AxelmondResearchLab"."VideoProcessingJob"("contentId");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "VideoProcessingJob_contentId_idx" ON "AxelmondResearchLab"."VideoProcessingJob"("contentId");
