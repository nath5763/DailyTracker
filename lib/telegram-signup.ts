export function telegramSignupNext(value?: string): string | null {
  if (!value) return null;
  const match = /^\/telegram\/signup\?intent=([A-Za-z0-9_-]{43})$/.exec(value);
  return match ? `/telegram/signup?intent=${match[1]}` : null;
}
