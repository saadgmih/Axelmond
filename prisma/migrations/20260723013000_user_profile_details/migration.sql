-- Add optional personal and student profile details without changing existing accounts.
ALTER TABLE "AxelmondResearchLab"."User"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "country" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "preferredLanguage" TEXT,
  ADD COLUMN "institution" TEXT,
  ADD COLUMN "studyLevel" TEXT,
  ADD COLUMN "academicYear" TEXT;

-- Preserve existing names while allowing users to refine them from their profile.
UPDATE "AxelmondResearchLab"."User"
SET
  "firstName" = CASE
    WHEN POSITION(' ' IN TRIM("fullName")) > 0 THEN SPLIT_PART(TRIM("fullName"), ' ', 1)
    ELSE TRIM("fullName")
  END,
  "lastName" = CASE
    WHEN POSITION(' ' IN TRIM("fullName")) > 0
      THEN SUBSTRING(TRIM("fullName") FROM POSITION(' ' IN TRIM("fullName")) + 1)
    ELSE ''
  END
WHERE "firstName" IS NULL OR "lastName" IS NULL;
