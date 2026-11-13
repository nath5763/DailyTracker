import { expect, test } from "vitest";
import { filterCatalog } from "./catalog-directory";
import type { CatalogGame } from "@/lib/types";

test("keeps Letter Bag in the games list with score tracking", () => {
  const games: CatalogGame[] = [
    { slug: "letter-bag", name: "Letter Bag", description: "Play here", category: "Word and Vocabulary", sourceUrl: "/daily/letter-bag", scoreTrackingAvailable: true },
    { slug: "wordle", name: "Wordle", description: "Guess a word", category: "Word and Vocabulary", sourceUrl: "https://example.com", scoreTrackingAvailable: true },
  ];

  expect(filterCatalog(games, "", "All").map((game) => game.slug)).toEqual(["letter-bag", "wordle"]);
  expect(filterCatalog(games, "", "All", true).map((game) => game.slug)).toEqual(["letter-bag", "wordle"]);
});
