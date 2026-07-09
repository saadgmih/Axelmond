import assert from "node:assert/strict";
import {
  compareDatetimeLocalValues,
  datetimeLocalToIso,
  formatDateDisplayValue,
  formatDatetimeDisplayValue,
  formatDatetimeLocalValue,
  formatTimeDisplayValue,
  mergeDisplayDateAndTime,
  parseDateDisplayInput,
  parseDatetimeDisplayInput,
  parseTimeDisplayInput,
} from "../src/utils/free-access-datetime.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("free-access-datetime", () => {
  assert.equal(parseDatetimeDisplayInput("09/07/2026 14:30"), "2026-07-09T14:30");
  assert.equal(parseDatetimeDisplayInput("09/07/2026"), "2026-07-09T00:00");
  assert.equal(parseDatetimeDisplayInput("2026-07-09 14:30"), "2026-07-09T14:30");
  assert.equal(parseDatetimeDisplayInput("2026-07-09T14:30"), "2026-07-09T14:30");

  assert.equal(parseDateDisplayInput("09/07/2026"), "2026-07-09");
  assert.equal(parseTimeDisplayInput("14:30"), "14:30");
  assert.equal(parseTimeDisplayInput("9:05"), "09:05");

  assert.equal(formatDatetimeDisplayValue("2026-07-09T14:30"), "09/07/2026 14:30");
  assert.equal(formatDateDisplayValue("2026-07-09T14:30"), "09/07/2026");
  assert.equal(formatTimeDisplayValue("2026-07-09T14:30"), "14:30");

  assert.equal(mergeDisplayDateAndTime("09/07/2026", "14:30"), "2026-07-09T14:30");
  assert.equal(mergeDisplayDateAndTime("09/07/2026", "", "2026-07-09T08:00"), "2026-07-09T08:00");

  const iso = datetimeLocalToIso("09/07/2026 14:30");
  assert.ok(iso);
  assert.match(iso!, /2026-07-09T/);

  assert.ok(compareDatetimeLocalValues("09/10/2026 10:00", "09/07/2026 14:30") > 0);

  const local = formatDatetimeLocalValue("2026-09-01T09:30:00.000Z");
  assert.match(local, /^2026-09-01T\d{2}:\d{2}$/);
});
