import { expect, test } from "vitest";
import { detectShareGame } from "./detect-share-game";

const games = ["fermi", "krillion"];

test("detects either game from mixed-case share text", () => {
  expect(detectShareGame("Fermi #92\n1.31× score", games)).toBe("fermi");
  expect(detectShareGame("kRiLlIoN #82 🦐\n180", games)).toBe("krillion");
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
