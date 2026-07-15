CREATE TYPE "AxelmondResearchLab"."OnboardingFlow" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
CREATE TYPE "AxelmondResearchLab"."OnboardingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'DISMISSED');

CREATE TABLE "AxelmondResearchLab"."UserOnboarding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flow" "AxelmondResearchLab"."OnboardingFlow" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "AxelmondResearchLab"."OnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserOnboarding_userId_flow_version_key"
ON "AxelmondResearchLab"."UserOnboarding"("userId", "flow", "version");

CREATE INDEX "UserOnboarding_userId_status_idx"
ON "AxelmondResearchLab"."UserOnboarding"("userId", "status");

ALTER TABLE "AxelmondResearchLab"."UserOnboarding"
ADD CONSTRAINT "UserOnboarding_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AxelmondResearchLab"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
