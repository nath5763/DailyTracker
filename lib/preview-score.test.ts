import { expect, test } from "vitest";
import { previewScore } from "./preview-score";

test("previews a Fermi result with date, percentile, and component scores", () => {
  expect(previewScore("fermi", "Fermi #92\n1.31× score\ntop 8%")).toEqual({
    puzzleKey: "92", puzzleNumber: 92, playedOn: "2026-10-26", primaryScore: 1.31,
    metrics: { displayScore: "1.31×", percentile: 8 }, parserVersion: 1,
  });
  expect(previewScore("fermi", "Fermi #7\n1,50x score\nQ1 1.20x\nQ2 1.40x\nQ3 2.10x").metrics)
    .toEqual({ displayScore: "1.50×", components: [1.2, 1.4, 2.1] });
});

test("treats grouped Fermi multipliers as thousands", () => {
  const preview = previewScore("fermi", "Fermi #103\n1,960x score\nQ1 1,200x\nQ2 2.50x\nQ3 4,000x");
  expect(preview.primaryScore).toBe(1960);
  expect(preview.metrics.displayScore).toBe("1,960×");
  expect(preview.metrics.components).toEqual([1200, 2.5, 4000]);
});

test("rejects invalid Fermi text before saving", () => {
  expect(() => previewScore("fermi", "Wordle #92\n0.5× score")).toThrow("Fermi");
});

test("previews a Krillion daily result and checks its seven symbols", () => {
  const result = previewScore("krillion", "Krillion #82 🦐\n180\n\n🐟🫧🫧🐟🦑🫧🐟\n\nhttps://krillion.io");
  expect(result).toEqual({ puzzleKey: "82", puzzleNumber: 82, playedOn: "2026-10-05", primaryScore: 180,
    metrics: { tiers: ["schooler", "plankton", "plankton", "schooler", "rare", "plankton", "schooler"] }, parserVersion: 1 });
  expect(previewScore("krillion", "Krillion #1 🦐\n0\n\n⬛⬛⬛⬛⬛⬛⬛").primaryScore).toBe(0);
  expect(previewScore("krillion", "Krillion #2 🦐\n700\n\n🌟🌟🌟🌟🌟🌟🌟").primaryScore).toBe(700);
});

test("rejects other Krillion modes and mismatched scores", () => {
  expect(() => previewScore("krillion", "Krillion ⟲ #82 🦐\n180\n\n🐟🫧🫧🐟🦑🫧🐟")).toThrow("numbered");
  expect(() => previewScore("krillion", "Krillion #82 🦐\n181\n\n🐟🫧🫧🐟🦑🫧🐟")).toThrow("does not match");
  expect(() => previewScore("krillion", "Krillion #82 🦐\n150\n\n🐟🫧🫧🐟🦑🫧")).toThrow("seven");
});
