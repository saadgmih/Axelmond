import assert from "node:assert/strict";
import {
  compareDatetimeLocalValues,
  datetimeLocalToIso,
  formatDatetimeDisplayValue,
  formatDatetimeLocalValue,
  parseDatetimeDisplayInput,
} from "../src/utils/free-access-datetime.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("free-access-datetime", () => {
  assert.equal(parseDatetimeDisplayInput("09/07/2026 14:30"), "2026-07-09T14:30");
  assert.equal(parseDatetimeDisplayInput("2026-07-09 14:30"), "2026-07-09T14:30");
  assert.equal(parseDatetimeDisplayInput("2026-07-09T14:30"), "2026-07-09T14:30");

  assert.equal(formatDatetimeDisplayValue("2026-07-09T14:30"), "09/07/2026 14:30");

  const iso = datetimeLocalToIso("09/07/2026 14:30");
  assert.ok(iso);
  assert.match(iso!, /2026-07-09T/);

  assert.ok(compareDatetimeLocalValues("09/10/2026 10:00", "09/07/2026 14:30") > 0);

  const local = formatDatetimeLocalValue("2026-09-01T09:30:00.000Z");
  assert.match(local, /^2026-09-01T\d{2}:\d{2}$/);
});
