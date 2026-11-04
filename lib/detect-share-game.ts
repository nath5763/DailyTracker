export function detectShareGame(rawText: string, availableSlugs: readonly string[]): string | null {
  const matches = ["fermi", "krillion"].filter((slug) =>
    new RegExp(`\\b${slug}\\b`, "i").test(rawText));
  return matches.length === 1 && availableSlugs.includes(matches[0]) ? matches[0] : null;
}
