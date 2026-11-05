export function discordSignupNext(value?: string): string | null {
  if (!value) return null;
  const match = /^\/discord\/signup\?intent=([A-Za-z0-9_-]{43})$/.exec(value);
  return match ? `/discord/signup?intent=${match[1]}` : null;
}
