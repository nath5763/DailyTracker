export function isLoldleShare(rawText: string): boolean {
  return /^I've completed all the modes of #LoLdle\b/im.test(rawText.trim());
}

export function detectShareGame(rawText: string, availableSlugs: readonly string[]): string | null {
  const aliases: Record<string, RegExp> = {
    "nyt-mini-crossword": /New York Times Mini Crossword/i,
    travle: /^#travle(?:_challenge)?\s+#/im,
    "daily-set": /^The Daily Set [🎯🔥] /mu,
    "daily-orbs": /^DailyOrbs [A-Z][a-z]+ \d{1,2} \d{4}$/m,
    "minute-cryptic": /^Minute Cryptic - \d{1,2} [A-Z][a-z]+, \d{4}$/m,
    nerdle: /^#?(?:nerdlegame|Nerdle) [1-9]\d* [1-6X]\/6$/im,
  };
  const matches = ["fermi", "krillion", "foximax", "wordle", "pinpoint", "queens", "crossclimb", "tango", "zip", "connections", "worldle", "globle", "murdle", "semantle", "contexto", "redactle", "strands", "nyt-mini-crossword", "nerdle", "quordle", "timeguessr", "travle", "farflung", "perceptle", "gazillion", "daily-set", "daily-orbs", "minute-cryptic"].filter((slug) =>
    (aliases[slug] ?? new RegExp(`\\b${slug}\\b`, "i")).test(rawText));
  return matches.length === 1 && availableSlugs.includes(matches[0]) ? matches[0] : null;
}
