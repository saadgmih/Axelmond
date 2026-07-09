import assert from "node:assert/strict";
import {
  deriveInclusiveFreeAccessDays,
  parseCalendarDateEnd,
  parseCalendarDateStart,
  resolveCourseFreeAccessWindow,
  resolveFreeEnrollmentEndDate,
} from "../src/course-free-access-window.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("course-free-access-window", () => {
  const window = resolveCourseFreeAccessWindow({
    price: 0,
    freeAccessStartsAt: "2026-09-01",
    freeAccessEndsAt: "2026-09-12",
  });
  assert.ok(window);
  assert.equal(window!.startsAt.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(window!.endsAt.toISOString(), "2026-09-12T23:59:59.999Z");
  assert.equal(deriveInclusiveFreeAccessDays(window!.startsAt, window!.endsAt), 12);

  const enrollLate = resolveFreeEnrollmentEndDate({
    price: 0,
    freeAccessStartsAt: "2026-09-01",
    freeAccessEndsAt: "2026-09-12",
  });
  assert.equal(enrollLate.toISOString(), "2026-09-12T23:59:59.999Z");

  const enrollMidOctober = resolveFreeEnrollmentEndDate({
    price: 0,
    freeAccessStartsAt: "2026-10-01",
    freeAccessEndsAt: "2026-11-01",
  });
  assert.equal(enrollMidOctober.toISOString(), parseCalendarDateEnd("2026-11-01").toISOString());

  const legacyWindow = resolveCourseFreeAccessWindow({
    price: 0,
    freeAccessStartsAt: "2026-09-01",
    freeAccessDurationDays: 30,
  });
  assert.ok(legacyWindow);
  assert.equal(parseCalendarDateStart(legacyWindow!.startsAt).toISOString(), "2026-09-01T00:00:00.000Z");
});
