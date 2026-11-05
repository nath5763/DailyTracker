import { expect, test } from "vitest";
import { rollingHeatmapDates } from "./leaderboard-insights";

test("builds exactly 30 local dates ending today across a month boundary", () => {
  const days = rollingHeatmapDates(new Date(2026, 10, 4, 23, 30));
  expect(days).toHaveLength(30);
  expect(days[0]).toEqual({ date: "2026-10-06", weekday: 1 });
  expect(days[29]).toEqual({ date: "2026-11-04", weekday: 2 });
  expect(days.filter(day => day.date.startsWith("2026-10"))).toHaveLength(26);
  expect(days.filter(day => day.date.startsWith("2026-11"))).toHaveLength(4);
  expect(days.every((day, index) => index === 0 || day.weekday === (days[index - 1].weekday + 1) % 7)).toBe(true);
});

test("stays continuous through a short February and daylight saving time", () => {
  const months = rollingHeatmapDates(new Date(2027, 2, 1, 0, 30));
  expect(months[0].date).toBe("2027-01-31");
  expect(months[29].date).toBe("2027-03-01");
  expect(months.filter(day => day.date.startsWith("2027-02"))).toHaveLength(28);

  const spring = rollingHeatmapDates(new Date(2026, 2, 9, 0, 30));
  expect(spring).toHaveLength(30);
  expect(new Set(spring.map(day => day.date)).size).toBe(30);
  expect(spring[29].date).toBe("2026-03-09");
});
