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
