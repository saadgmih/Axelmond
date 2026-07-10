ALTER TABLE "AxelmondResearchLab"."LiveSession"
ADD COLUMN "replayContentId" TEXT,
ADD COLUMN "recordingStatus" TEXT NOT NULL DEFAULT 'NONE';

CREATE INDEX "LiveSession_recordingStatus_idx" ON "AxelmondResearchLab"."LiveSession"("recordingStatus");
