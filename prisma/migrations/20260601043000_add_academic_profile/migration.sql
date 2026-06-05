CREATE TABLE "AcademicProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "lab" TEXT,
    "speciality" TEXT,
    "teachingDomains" JSONB NOT NULL DEFAULT '[]',
    "researchDomains" JSONB NOT NULL DEFAULT '[]',
    "bio" TEXT,
    "avatarUrl" TEXT,
    "links" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicProfile_userId_key" ON "AcademicProfile"("userId");

ALTER TABLE "AcademicProfile" ADD CONSTRAINT "AcademicProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
