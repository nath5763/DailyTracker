import { describe, expect, it } from "vitest";
import { formatScore } from "./format";

describe("score formatting", () => {
  it("formats backend numeric values consistently", () => {
    expect(formatScore(1.3)).toBe("1.30×");
    expect(formatScore(null)).toBe("—");
  });
});
