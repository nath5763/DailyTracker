import { describe, expect, test } from "vitest";
import { extendedPreviewScore } from "./extended-preview-score";
import { formatScore } from "./format";
import { filterCatalog } from "../components/catalog-directory";
import type { CatalogGame } from "./types";

// Public share examples: https://teapaw.org/dampedspring and
// https://www.boards.ie/discussion/2058350094/linkedin-games/p27
const examples = {
  wordle: "Wordle 1,961 4/6*\n⬜🟨⬜🟨🟨\n🟨⬜⬜🟩🟩\n⬜⬜🟩🟩🟩\n🟩🟩🟩🟩🟩",
  pinpoint: "Pinpoint #747 | 1 guess with no mistakes\n1️⃣ | 100% match 📌\nlnkd.in/pinpoint.",
  queens: "Queens #918 | 3:11 with no hints\nFirst 👑s: 🟦 🟪 🟧\nlnkd.in/queens.",
  crossclimb: "Crossclimb #918 | 1:38 with no hints\nFill order: 1️⃣ 2️⃣ 3️⃣ 5️⃣ 4️⃣ ⬇️ ⬆️ 🪜\nlnkd.in/crossclimb.",
  tango: "Tango #758 | 1:00 with no mistakes & no hints\nFirst 5 placements: 🟨🟨🟨🟨🟨🟨 🟨🟨🟨🟨🟨🟨 2️⃣🟨1️⃣🟨🟨🟨 3️⃣🟨🟨🟨🟨🟨 4️⃣🟨🟨🟨🟨🟨 5️⃣🟨🟨🟨🟨🟨\nlnkd.in/tango.",
  zip: "Zip #373 | 0:08 and flawless 🏁 With no backtracks 🟢\nlnkd.in/zip.",
};
describe("extended score previews", () => {
  test.each(Object.entries(examples))("parses a current %s share", (slug, share) => {
    const result = extendedPreviewScore(slug, share);
    expect(result.puzzleKey).toMatch(/^\d+$/);
    expect(result.primaryScore).toBeGreaterThan(0);
    expect(result.parserVersion).toBe(1);
  });
  test("ranks Wordle loss as seven but displays X/6", () => {
    const loss = `Wordle 1,962 X/6\n${Array(6).fill("⬛⬛⬛⬛⬛").join("\n")}`;
    expect(extendedPreviewScore("wordle", loss)).toMatchObject({ primaryScore: 7, metrics: { displayScore: "X/6" } });
  });
  test("accepts an official Wordle link appended by a device share", () => {
    expect(extendedPreviewScore("wordle", examples.wordle + "\nhttps://www.nytimes.com/games/wordle/index.html").primaryScore).toBe(4);
  });
  test("keeps assistance and rejects incomplete or mixed scores", () => {
    expect(extendedPreviewScore("queens", examples.queens.replace("no hints", "2 hints")).metrics.hints).toBe(2);
    expect(extendedPreviewScore("queens", examples.queens).metrics.assistanceStatus).toBe("unknown");
    expect(extendedPreviewScore("queens", examples.queens.replace("no hints", "no mistakes & no hints")).metrics.assistanceStatus).toBe("unassisted");
    expect(() => extendedPreviewScore("wordle", "Wordle 1961 4/6")).toThrow();
    expect(() => extendedPreviewScore("pinpoint", examples.pinpoint.replace("100% match", "90% match"))).toThrow();
    expect(() => extendedPreviewScore("queens", examples.queens.replace("3:11", "3:11 | 4:12"))).toThrow();
    expect(extendedPreviewScore("crossclimb", examples.crossclimb.replaceAll("\n", " ")).primaryScore).toBe(98);
    expect(extendedPreviewScore("crossclimb", examples.crossclimb.replace("lnkd.in/crossclimb", "https://www.linkedin.com/games/crossclimb/")).primaryScore).toBe(98);
  });
  test("formats times and guess averages", () => {
    expect(formatScore(98, { prefix: "", suffix: "", minimumDecimalPlaces: 0, maximumDecimalPlaces: 0, kind: "duration" })).toBe("1:38");
    expect(formatScore(3.5, { prefix: "", suffix: " guesses", minimumDecimalPlaces: 0, maximumDecimalPlaces: 2, kind: "guesses" })).toBe("3.5 guesses");
  });
});

test("catalog filters keep catalog-only games separate from tracked games", () => {
  const games: CatalogGame[] = [
    { slug: "wordle", name: "Wordle", description: "Guess a word", category: "Words", sourceUrl: "https://www.nytimes.com/games/wordle/index.html", scoreTrackingAvailable: true },
    { slug: "waffle", name: "Waffle", description: "Swap letters", category: "Words", sourceUrl: "https://wafflegame.net/", scoreTrackingAvailable: false },
    { slug: "zip", name: "Zip", description: "Draw a path", category: "Logic", sourceUrl: "https://www.linkedin.com/games/zip/", scoreTrackingAvailable: true },
  ];
  expect(filterCatalog(games, "swap", "All").map((game) => game.slug)).toEqual(["waffle"]);
  expect(filterCatalog(games, "", "Logic").map((game) => game.slug)).toEqual(["zip"]);
  expect(games.filter((game) => game.scoreTrackingAvailable)).toHaveLength(2);
});
