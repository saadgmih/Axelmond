import assert from "node:assert/strict";
import { test } from "vitest";
import {
  addDays,
  buildMonthGrid,
  dateToScheduleDayOfWeek,
  formatDateKey,
  startOfWeekMonday,
} from "../src/components/calendar/calendar-utils";

test("dateToScheduleDayOfWeek maps Monday to 0 and Sunday to 6", () => {
  assert.equal(dateToScheduleDayOfWeek(new Date(2026, 5, 8)), 0);
  assert.equal(dateToScheduleDayOfWeek(new Date(2026, 5, 14)), 6);
});

test("startOfWeekMonday returns Monday for any date in the week", () => {
  const monday = startOfWeekMonday(new Date(2026, 5, 12));
  assert.equal(monday.getDay(), 1);
  assert.equal(monday.getDate(), 8);
});

test("addDays shifts calendar dates", () => {
  const base = new Date(2026, 5, 10);
  assert.equal(addDays(base, 3).getDate(), 13);
});

test("buildMonthGrid returns 42 cells", () => {
  const grid = buildMonthGrid(2026, 5);
  assert.equal(grid.length, 42);
});

test("formatDateKey returns YYYY-MM-DD", () => {
  assert.equal(formatDateKey(new Date(2026, 5, 15)), "2026-06-15");
});
