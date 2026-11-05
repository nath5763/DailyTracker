import { expect, test } from "vitest";
import { calendarMonths } from "./leaderboard-insights";

test("builds Monday-first month calendars across the 30-day range", () => {
  const months = calendarMonths("2026-10-06", "2026-11-04");
  expect(months.map(month => month.key)).toEqual(["2026-10", "2026-11"]);
  expect(months[0].days.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
  expect(months[0].days.filter(Boolean)).toHaveLength(31);
  expect(months[1].days.filter(Boolean)).toHaveLength(30);
  expect(months.every(month => month.days.length % 7 === 0)).toBe(true);
});

test("handles a rolling window that crosses three months in a short February", () => {
  expect(calendarMonths("2027-01-31", "2027-03-01").map(month => month.key))
    .toEqual(["2027-01", "2027-02", "2027-03"]);
});
