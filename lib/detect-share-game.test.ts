import { expect, test } from "vitest";
import { detectShareGame, isLoldleShare } from "./detect-share-game";

const games = ["fermi", "krillion"];

test("routes complete and malformed LoLdle headers to the five-score preview", () => {
  expect(isLoldleShare("I've completed all the modes of #LoLdle today:\n❓ Classic: 8")).toBe(true);
  expect(isLoldleShare("I've completed all the modes of #LoLdle\n❓ Classic: 8")).toBe(true);
  expect(isLoldleShare("Wordle #1\n1/6")).toBe(false);
});

test("detects either game from mixed-case share text", () => {
  expect(detectShareGame("Fermi #92\n1.31× score", games)).toBe("fermi");
  expect(detectShareGame("kRiLlIoN #82 🦐\n180", games)).toBe("krillion");
});

test("detects a FoxiMax share", () => {
  expect(detectShareGame("🦊#FoxiMax #1549 6/8 (19 letters)\nhttps://foximax.com/", ["foximax"]))
    .toBe("foximax");
});

test("leaves unknown, ambiguous, and unavailable games for manual selection", () => {
  expect(detectShareGame("Wordle #92", games)).toBeNull();
  expect(detectShareGame("Fermi and Krillion", games)).toBeNull();
  expect(detectShareGame("Krillion #82", ["fermi"])).toBeNull();
  expect(detectShareGame("notfermish #1", games)).toBeNull();
});

test("distinguishes Worldle from Wordle by name", () => {
  expect(detectShareGame("#Worldle #1103 (28.01.2025) 1/6 (100%)", ["wordle", "worldle"])).toBe("worldle");
});

test("detects normalized multi-metric games by their signed header", () => {
  expect(detectShareGame("Daily Quordle 1746\n5️⃣9️⃣\n8️⃣", ["quordle"])).toBe("quordle");
  expect(detectShareGame("TimeGuessr #807 — 40,693/50,000", ["timeguessr"])).toBe("timeguessr");
});

test("detects both Travle share modes without matching practice or mixed shares", () => {
  expect(detectShareGame("#travle #1439 +2\n✅🟧✅\nhttps://travle.earth", ["travle"])).toBe("travle");
  expect(detectShareGame("#travle_challenge #38 +0\n✅✅\nhttps://travle.earth/challenge", ["travle"])).toBe("travle");
  expect(detectShareGame("#travle_practice #1 +0", ["travle"])).toBeNull();
  expect(detectShareGame("#travle #1439 +0\nWordle 1961 2/6", ["travle", "wordle"])).toBeNull();
});

test("detects a Farflung daily result", () => {
  const share = "Farflung #50 · 195/500 km\nMiss · Elusive · Rare · Miss · Common\nhttps://farflung.game/s/qtrtpp?e=50";
  expect(detectShareGame(share, ["farflung"])).toBe("farflung");
  expect(detectShareGame(share + "\nWordle 1961 2/6", ["farflung", "wordle"])).toBeNull();
});
