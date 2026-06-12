import assert from "node:assert/strict";
import {
  buildAdaptiveQualityNotice,
  buildConnectionChangeNotice,
  buildManualQualityNotice,
  normalizeConnectionQuality,
  suggestAdaptiveQualityChange,
} from "../src/live/live-connection-notice.ts";

assert.equal(normalizeConnectionQuality("excellent"), "excellent");
assert.equal(normalizeConnectionQuality("poor"), "poor");

const slowNotice = buildConnectionChangeNotice("good", "poor");
assert.ok(slowNotice);
assert.match(slowNotice!.message, /Connexion lente/i);

const improvedNotice = buildConnectionChangeNotice("poor", "excellent");
assert.ok(improvedNotice);
assert.match(improvedNotice!.message, /excellente/i);

assert.match(buildManualQualityNotice("auto").message, /automatique/i);
assert.match(buildManualQualityNotice("720p").message, /720p/);

const adaptiveDown = buildAdaptiveQualityNotice("720p", "480p");
assert.ok(adaptiveDown);
assert.match(adaptiveDown!.message, /réduite/i);

assert.equal(suggestAdaptiveQualityChange("poor", "720p"), "480p");
assert.equal(suggestAdaptiveQualityChange("excellent", "480p"), "720p");

console.log("Live connection notice rules passed");
