import { describe, expect, it } from "vitest";
import { baseWordPoints, letterBonus, wordScore } from "./scoring";

describe("Letter Bag scoring", () => {
  it("keeps progressive word-length points", () => {
    expect([3, 4, 5].map(baseWordPoints)).toEqual([7, 11, 16]);
    expect(wordScore("CAT")).toEqual({ base: 7, bonus: 0, total: 7 });
    expect(wordScore("PLANT").total).toBe(16);
  });
  it("awards the rare-letter bonus for every occurrence", () => {
    expect(["Q", "Z", "J", "X", "K", "V", "A"].map(letterBonus)).toEqual([2, 2, 1, 1, 1, 1, 0]);
    expect(wordScore("JAM").total).toBe(8);
    expect(wordScore("ZIP").total).toBe(9);
    expect(wordScore("JAZZ")).toEqual({ base: 11, bonus: 5, total: 16 });
    expect(wordScore("QUIZ")).toEqual({ base: 11, bonus: 4, total: 15 });
  });
});
