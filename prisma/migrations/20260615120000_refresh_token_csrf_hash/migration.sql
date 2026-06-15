-- Bind CSRF tokens to refresh sessions for native mobile clients (no HttpOnly cookie).
ALTER TABLE "AxelmondResearchLab"."RefreshToken"
ADD COLUMN IF NOT EXISTS "csrfTokenHash" TEXT;
