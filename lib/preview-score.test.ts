import { expect, test } from "vitest";
import { previewScore } from "./preview-score";

test("previews a Fermi result with date, percentile, and component scores", () => {
  expect(previewScore("fermi", "Fermi #92\n1.31× score\ntop 8%")).toEqual({
    puzzleKey: "92", puzzleNumber: 92, playedOn: "2026-10-26", primaryScore: 1.31,
    metrics: { displayScore: "1.31×", percentile: 8 }, parserVersion: 1,
  });
  expect(previewScore("fermi", "Fermi #7\n1,50x score\nQ1 1.20x\nQ2 1.40x\nQ3 2.10x").metrics)
    .toEqual({ displayScore: "1.5×", components: [1.2, 1.4, 2.1] });
  expect(previewScore("fermi", "Fermi #8\n1.235x score").metrics.displayScore).toBe("1.24×");
});

test("treats grouped Fermi multipliers as thousands", () => {
  const preview = previewScore("fermi", "Fermi #103\n1,960x score\nQ1 1,200x\nQ2 2.50x\nQ3 4,000x");
  expect(preview.primaryScore).toBe(1960);
  expect(preview.metrics.displayScore).toBe("1960×");
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

test("previews Travle Daily and Weekly Challenge results with mode-specific dates and keys", () => {
  expect(previewScore("travle", "#travle #1439 +2 (1 hint)\n✅🟧🟩✅\nhttps://travle.earth")).toEqual({
    puzzleKey: "Daily:1439", puzzleNumber: 1439, playedOn: "2026-11-22", primaryScore: 2,
    metrics: { completionStatus: "WIN", extraGuesses: 2, hints: 1, assistanceStatus: "assisted",
      resultSequence: "✅🟧🟩✅", gameMode: "Daily", displayScore: "+2" }, parserVersion: 1,
  });
  expect(previewScore("travle", "#travle_challenge #38 +1✅🟥✅\nhttps://travle.earth/challenge")).toMatchObject({
    puzzleKey: "Weekly:38", puzzleNumber: 38, playedOn: "2024-10-21", primaryScore: 1,
    metrics: { hints: 0, gameMode: "Weekly", resultSequence: "✅🟥✅", displayScore: "+1" },
  });
});

test("previews perfect and plural-hint Travle scores", () => {
  expect(previewScore("travle", "#travle #1439 +0 (Perfect) ✅✅✅\nhttps://travle.earth/")).toMatchObject({
    primaryScore: 0, metrics: { hints: 0, assistanceStatus: "unassisted", displayScore: "+0" },
  });
  expect(previewScore("travle", "#travle_challenge #38 +0 (3 hints)\n🟩🟩✅\nhttps://travle.earth/challenge/").metrics)
    .toMatchObject({ hints: 3, assistanceStatus: "assisted" });
});

test("rejects malformed or mismatched Travle shares", () => {
  const invalid = [
    "#travle_practice #1439 +0\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0\n✅✅\nhttps://travle.earth/challenge",
    "#travle_challenge #38 +0\n✅✅\nhttps://travle.earth",
    "#travle #1439 +7\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0 (4 hints)\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0 (1 hints)\n✅✅\nhttps://travle.earth",
    "#travle #1439 +1 (Perfect)\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0\nhttps://travle.earth",
    "#travle #1439 +0\n✅✅\nWordle 1 1/6\nhttps://travle.earth",
    "#travle #100000 +0\n✅✅\nhttps://travle.earth",
  ];
  for (const share of invalid) expect(() => previewScore("travle", share)).toThrow();
});

test("previews the supplied Farflung result with verified rarities and date", () => {
  const share = "Farflung #50 · 195/500 km\nMiss · Elusive · Rare · Miss · Common\nhttps://farflung.game/s/qtrtpp?e=50";
  expect(previewScore("farflung", share)).toEqual({
    puzzleKey: "50",
    puzzleNumber: 50,
    playedOn: "2026-11-23",
    primaryScore: 195,
    metrics: {
      completionStatus: "WIN",
      distanceKm: 195,
      rarities: ["Miss", "Elusive", "Rare", "Miss", "Common"],
      gameMode: "Daily",
      scoreRaw: "195/500 km",
      scoreUnit: "km",
      displayScore: "195/500 km",
    },
    parserVersion: 1,
  });
});

test("accepts Farflung score boundaries and rejects malformed or starred shares", () => {
  expect(previewScore("farflung", "Farflung #1 · 0/500 km\n" +
    "Miss · Miss · Miss · Miss · Miss\nhttps://farflung.game/s/aaaaaa?e=1").primaryScore).toBe(0);
  expect(previewScore("farflung", "Farflung #1 · 500/500 km\n" +
    "Farflung · Farflung · Farflung · Farflung · Farflung\nhttps://farflung.game/s/zzzzzz?e=1").primaryScore).toBe(500);

  const share = "Farflung #50 · 195/500 km\nMiss · Elusive · Rare · Miss · Common\nhttps://farflung.game/s/qtrtpp?e=50";
  const invalid = [
    share.replace("195/500", "196/500"),
    share.replace("Miss · Common", "Common"),
    share.replace("Common", "Legendary"),
    share.replace("?e=50", "?e=49"),
    share.replace("farflung.game", "example.com"),
    share.replace("qtrtpp", "QTRTPP"),
    share.replace("#50", "#050"),
    share.replace("195/500 km", "195/500 km ★"),
    share + "\nWordle 1 1/6",
    "Farflung #100000 · 0/500 km\nMiss · Miss · Miss · Miss · Miss\nhttps://farflung.game/s/aaaaaa?e=100000",
  ];
  for (const value of invalid) expect(() => previewScore("farflung", value)).toThrow();
});
