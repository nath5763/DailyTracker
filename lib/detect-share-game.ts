export function detectShareGame(rawText: string, availableSlugs: readonly string[]): string | null {
  const aliases: Record<string, RegExp> = {
    "nyt-mini-crossword": /New York Times Mini Crossword/i,
  };
  const matches = ["fermi", "krillion", "wordle", "pinpoint", "queens", "crossclimb", "tango", "zip", "connections", "worldle", "globle", "murdle", "semantle", "contexto", "redactle", "strands", "nyt-mini-crossword", "nerdle", "quordle", "timeguessr"].filter((slug) =>
    (aliases[slug] ?? new RegExp(`\\b${slug}\\b`, "i")).test(rawText));
  return matches.length === 1 && availableSlugs.includes(matches[0]) ? matches[0] : null;
}
