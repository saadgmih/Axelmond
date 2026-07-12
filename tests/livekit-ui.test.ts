import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { readAppSources } from "./helpers/app-sources.ts";
import { readLiveClassroomSources, readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("livekit-ui", () => {
  const appSource = readAppSources();
  const liveKitSessionHost = readFileSync("src/views/live/LiveKitSessionHost.tsx", "utf8");
  const liveKitSource = appSource + readLiveKitHookSources();
  const classroomSource = readLiveClassroomSources();

  assert.match(classroomSource, /<ScreenShare\b/);
  assert.match(classroomSource, /<Fullscreen\b/);
  assert.doesNotMatch(appSource, /<Maximize\b/);
  assert.match(appSource, /activeLiveCourse/);
  assert.match(liveKitSource, /leaveLiveRoom/);
  assert.match(liveKitSessionHost, /renderLiveRoomInterface\([\s\S]*\? "teacher" : "student"/);
  assert.match(liveKitSource, /api\.leaveLiveAttendance/);
  assert.match(liveKitSource, /api\.moderateLiveParticipant/);
  assert.match(classroomSource, /Classe virtuelle sécurisée/);
  assert.match(classroomSource, /Tableau blanc collaboratif/);
  assert.match(classroomSource, /Rapport de présence/);
  assert.match(appSource, /Live actif/);

  assert.match(classroomSource, /LiveSettingsPanel/);
  assert.match(classroomSource, /live-panel-input/);
  assert.match(readFileSync("src/index.css", "utf8"), /\.live-panel-input:focus-visible/);
  assert.match(classroomSource, /Paramètres Live/);
  assert.match(classroomSource, /PictureInPicture2/);
  assert.match(classroomSource, /Mode concentration/);
  assert.match(classroomSource, /resolveStageParticipants/);
  assert.match(classroomSource, /LiveResourceStage/);
  assert.match(liveKitSource, /LIVE_SYNC_TOPIC/);
  assert.match(liveKitSource, /ACTIVE_SPEAKER_SWITCH_DELAY_MS/);
  assert.match(liveKitSource, /ACTIVE_SPEAKER_CLEAR_DELAY_MS/);
  assert.match(liveKitSource, /activeSpeakerClearTimerRef/);
  assert.match(classroomSource, /useLiveConnectionNotice/);
  assert.doesNotMatch(classroomSource, /Panneau interactif/);
  assert.match(classroomSource, /key: "v"/);
  assert.match(classroomSource, /key: "t"/);
  assert.match(
    readFileSync(new URL("../src/components/live/LiveSettingsPanel.tsx", import.meta.url), "utf8"),
    /createPortal/,
  );
  assert.match(
    readFileSync(new URL("../src/components/live/LiveSettingsPanel.tsx", import.meta.url), "utf8"),
    /Bientôt disponible/,
  );
});

console.log("LiveKit UI rules passed");
