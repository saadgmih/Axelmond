-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'PROFESSOR', 'RESEARCHER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "levelOrTitle" TEXT,
    "filiere" TEXT,
    "invoices" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessorInviteCode" (
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdById" TEXT,

    CONSTRAINT "ProfessorInviteCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "iconName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isLiveNow" BOOLEAN NOT NULL DEFAULT false,
    "liveSubject" TEXT,
    "modules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "title" TEXT,
    "courseId" INTEGER NOT NULL,
    "professorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMessage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "roomName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    "userId" TEXT,

    CONSTRAINT "LiveMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_roomName_key" ON "LiveSession"("roomName");

-- CreateIndex
CREATE UNIQUE INDEX "LiveMessage_clientId_key" ON "LiveMessage"("clientId");

-- AddForeignKey
ALTER TABLE "ProfessorInviteCode" ADD CONSTRAINT "ProfessorInviteCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessorInviteCode" ADD CONSTRAINT "ProfessorInviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
