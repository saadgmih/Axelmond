ALTER TABLE "AxelmondResearchLab"."Course"
ADD COLUMN "freeAccessDurationDays" INTEGER;

ALTER TABLE "AxelmondResearchLab"."Course"
ADD CONSTRAINT "Course_freeAccessDurationDays_check"
CHECK ("freeAccessDurationDays" IS NULL OR "freeAccessDurationDays" > 0);
