import assert from "node:assert/strict";
import {
  AI_TUTOR_ADDON_PRICE_MAD,
  computeAiTutorAddonPriceMad,
  computeCourseCheckoutTotalMad,
  resolveEnrollmentHasAiAccess,
} from "../src/utils/ai-tutor-pricing.ts";
import { getActiveAiTutorCourseIds } from "../src/enrollment-access.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("ai-tutor-pricing", () => {
  assert.equal(AI_TUTOR_ADDON_PRICE_MAD, 50);
  assert.equal(computeAiTutorAddonPriceMad(false), 50);
  assert.equal(computeAiTutorAddonPriceMad(true), 0);
  assert.equal(
    computeCourseCheckoutTotalMad({ modulePriceMad: 120, includeAiAssistant: true, isFreeModule: false }),
    170,
  );
  assert.equal(computeCourseCheckoutTotalMad({ modulePriceMad: 0, includeAiAssistant: true, isFreeModule: true }), 0);
  assert.equal(resolveEnrollmentHasAiAccess(true), true);
  assert.equal(resolveEnrollmentHasAiAccess(false), false);

  const now = new Date("2026-07-12T12:00:00.000Z");
  const activeAiIds = getActiveAiTutorCourseIds(
    [
      { courseId: 1, active: true, hasAiAccess: true, endDate: new Date("2026-08-01T00:00:00.000Z") },
      { courseId: 2, active: true, hasAiAccess: false, endDate: new Date("2026-08-01T00:00:00.000Z") },
      { courseId: 3, active: true, hasAiAccess: true, endDate: new Date("2026-06-01T00:00:00.000Z") },
    ],
    now,
  );
  assert.deepEqual(activeAiIds, [1]);

  console.log("AI tutor pricing tests passed");
});
