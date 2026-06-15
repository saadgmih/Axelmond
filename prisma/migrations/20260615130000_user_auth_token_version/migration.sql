-- Invalidate legacy JWTs on demand by bumping per-user auth token version.
ALTER TABLE "AxelmondResearchLab"."User"
ADD COLUMN IF NOT EXISTS "authTokenVersion" INTEGER NOT NULL DEFAULT 0;
