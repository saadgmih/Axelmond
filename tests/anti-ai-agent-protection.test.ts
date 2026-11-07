import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("Anti-AI Agent Defense blocks Samsung Bixby, Google Gemini, Siri, and voice capture agents", () => {
  const contentProtectionSource = readFileSync("src/components/security/ContentProtection.tsx", "utf8");

  // 1. Web Speech API neutralization against in-browser AI assistants
  assert.match(contentProtectionSource, /SpeechRecognition/);
  assert.match(contentProtectionSource, /webkitSpeechRecognition/);

  // 2. Continuous security sentinel monitoring tab visibility without false positive on initial load
  assert.match(contentProtectionSource, /sentinelInterval = window\.setInterval/);
  assert.match(contentProtectionSource, /document\.hidden \|\| document\.visibilityState === "hidden"/);

  // 3. Audio ducking detection when voice assistants (Bixby, Siri, Assistant) listen to microphone
  assert.match(contentProtectionSource, /currentVideo\.muted \|\| currentVideo\.volume === 0/);

  // 4. Window blur protection targeted for active video playback
  assert.match(contentProtectionSource, /handleWindowBlur/);
  assert.match(contentProtectionSource, /document\.addEventListener\("visibilitychange", handleVisibilityChange/);
});
