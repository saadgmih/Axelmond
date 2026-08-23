import assert from "node:assert/strict";
import {
  PLATFORM_CREDITS_ABBREV,
  PLATFORM_CREDITS_NAME,
  creditsLabel,
  formatCredits,
} from "../src/utils/morocco-locale.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("morocco-locale", () => {
  assert.equal(PLATFORM_CREDITS_ABBREV, "PA");
  assert.equal(PLATFORM_CREDITS_NAME, "Performance Académique");
  // Libellé complet depuis 2154041 (style curriculum : field labels).
  assert.equal(creditsLabel(), "Points de complétion (PA)");
  assert.equal(formatCredits(1), "1 PA");
  assert.equal(formatCredits(23), "23 PA");
});

console.log("Morocco locale rules passed");
