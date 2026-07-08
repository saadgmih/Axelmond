ALTER TABLE "AxelmondResearchLab"."Course"
ADD COLUMN "freeAccessStartsAt" TIMESTAMP(3),
ADD COLUMN "freeAccessEndsAt" TIMESTAMP(3);

UPDATE "AxelmondResearchLab"."Course"
SET "freeAccessStartsAt" = "createdAt"
WHERE "price" <= 0
  AND "freeAccessStartsAt" IS NULL;

UPDATE "AxelmondResearchLab"."Course"
SET "freeAccessEndsAt" =
  COALESCE("freeAccessStartsAt", "createdAt") +
  (COALESCE("freeAccessDurationDays", 30) * INTERVAL '1 day')
WHERE "price" <= 0
  AND "freeAccessEndsAt" IS NULL;
