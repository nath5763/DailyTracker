import { describe, expect, it } from "vitest";
import { dateForFermiPuzzle, parseFermiShareText } from "./fermi";

describe("Fermi share parser", () => {
  it("parses a standard Unicode result", () => {
    expect(parseFermiShareText("Fermi #92\n1.31× score\ntop 8%")).toEqual({
      ok: true,
      value: {
        puzzleKey: "92",
        puzzleNumber: 92,
        playedOn: "2026-10-26",
        primaryScore: 1.31,
        metrics: { percentile: 8 },
        parserVersion: 1,
      },
    });
  });

  it("accepts x, commas, whitespace, and a No. puzzle label", () => {
    const result = parseFermiShareText("FERMI No. 12\r\n 1,75 x SCORE ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.primaryScore).toBe(1.75);
  });

  it("captures optional component multipliers", () => {
    const result = parseFermiShareText("Fermi #7\n1.50× score\nQ1 1.20×\nQ2 1.40×\nQ3 2.10×");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.metrics.components).toEqual([1.2, 1.4, 2.1]);
  });

  it("rejects missing puzzle numbers and invalid scores", () => {
    const result = parseFermiShareText("Fermi\n0.5× score");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(2);
  });

  it("rejects non-Fermi text", () => {
    expect(parseFermiShareText("Wordle #92\n1.31× score").ok).toBe(false);
  });

  it("maps puzzle one and known puzzle 92 to Eastern release dates", () => {
    expect(dateForFermiPuzzle(1)).toBe("2026-07-27");
    expect(dateForFermiPuzzle(92)).toBe("2026-10-26");
  });
});
