import assert from "node:assert/strict";
import fs from "node:fs";
import { readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("phase4-refactoring", () => {
  // P15 — institutional legal page shell extracted
  assert.ok(fs.existsSync("src/components/legal/InstitutionalPageShell.tsx"));
  const shellSource = fs.readFileSync("src/components/legal/InstitutionalPageShell.tsx", "utf8");
  assert.match(shellSource, /export const InstitutionalPageRoot/);
  assert.match(shellSource, /export const InstitutionalHero/);

  for (const view of [
    "src/components/LegalView.tsx",
    "src/components/PrivacyView.tsx",
    "src/components/TermsView.tsx",
    "src/components/CookiesView.tsx",
    "src/components/AboutView.tsx",
  ]) {
    const source = fs.readFileSync(view, "utf8");
    assert.match(source, /from "\.\/legal\/InstitutionalPageShell"/);
    assert.match(source, /InstitutionalPageRoot/);
    assert.doesNotMatch(source, /^const Fade:/m);
    assert.doesNotMatch(source, /^const FadeIn:/m);
  }

  // P16 — useLiveKitRoom decomposed into livekit modules
  const facadeSource = fs.readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8");
  assert.match(facadeSource, /from "\.\/livekit\/useLiveKitConnection"/);
  assert.match(facadeSource, /from "\.\/livekit\/useLiveRoomControls"/);
  assert.match(facadeSource, /from "\.\/livekit\/useLiveMediaAttach"/);
  assert.match(facadeSource, /from "\.\/livekit\/participant-sync"/);
  assert.doesNotMatch(facadeSource, /new Room\(/);
  assert.doesNotMatch(facadeSource, /RoomEvent\./);

  const hookBundle = readLiveKitHookSources();
  assert.match(hookBundle, /buildLiveParticipantCards/);
  assert.match(hookBundle, /createPublishLiveSync/);
  assert.ok(hookBundle.length < 120_000, "livekit hook bundle should be split across modules");

  // P12 — hardened PayPal CSP (no wildcard subdomains)
  const paypalCsp = fs.readFileSync("src/paypal-csp.ts", "utf8");
  assert.doesNotMatch(paypalCsp, /"https:\/\/\*\.paypal\.com"/);
  assert.match(paypalCsp, /checkout\.sandbox\.paypal\.com/);

  const createApp = fs.readFileSync("src/server/create-app.ts", "utf8");
  assert.match(createApp, /from "\.\.\/paypal-csp"/);
  assert.doesNotMatch(createApp, /"https:\/\/\*\.paypal\.com"/);

  // P19 — Docker Compose stack
  const compose = fs.readFileSync("docker-compose.yml", "utf8");
  assert.match(compose, /postgres:/);
  assert.match(compose, /redis:/);
  assert.match(compose, /app:/);
  assert.match(compose, /REDIS_URL/);
  assert.match(compose, /DATABASE_URL/);

  console.log("Phase 4 refactoring guards passed");
});
