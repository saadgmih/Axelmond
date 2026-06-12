import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  buildMonthGrid,
  dateToScheduleDayOfWeek,
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

test("buildMonthGrid returns 42 cells starting on Monday", () => {
  const grid = buildMonthGrid(2026, 5, new Date(2026, 5, 12));
  assert.equal(grid.length, 42);
  assert.equal(grid[0].date.getDay(), 1);
  assert.equal(grid.find((cell) => cell.isToday)?.date.getDate(), 12);
});

test("addDays preserves local calendar date math", () => {
  const base = new Date(2026, 5, 30);
  assert.equal(addDays(base, 1).getDate(), 1);
  assert.equal(addDays(base, 1).getMonth(), 6);
});
