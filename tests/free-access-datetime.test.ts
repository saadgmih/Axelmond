import assert from "node:assert/strict";
import {
  compareDatetimeLocalValues,
  datetimeLocalToIso,
  formatDatetimeLocalValue,
} from "../src/utils/free-access-datetime.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("free-access-datetime", () => {
  const local = formatDatetimeLocalValue("2026-09-01T09:30:00.000Z");
  assert.match(local, /^2026-09-01T\d{2}:\d{2}$/);

  const iso = datetimeLocalToIso("2026-10-01T14:15");
  assert.ok(iso);
  assert.match(iso!, /2026-10-01T/);

  assert.ok(compareDatetimeLocalValues("2026-10-02T10:00", "2026-10-01T10:00") > 0);
  assert.ok(compareDatetimeLocalValues("2026-10-01T10:00", "2026-10-01T10:00") === 0);
});
