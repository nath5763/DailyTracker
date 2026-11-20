import { describe, expect, it } from "vitest";
import { formatBloomTime } from "@/lib/bloom-and-boom/format";

describe("Bloom & Boom time display", () => {
  it("formats elapsed milliseconds to hundredths", () => {
    expect(formatBloomTime(0)).toBe("0:00.00");
    expect(formatBloomTime(62_349)).toBe("1:02.34");
    expect(formatBloomTime(-1)).toBe("0:00.00");
  });
});
