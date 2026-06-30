CREATE TABLE "AxelmondResearchLab"."SiteSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "AxelmondResearchLab"."SiteSetting" ("key", "value", "createdAt", "updatedAt")
VALUES ('forceDesktopMode', 'false'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
