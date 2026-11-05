export function leaderboardInviteNext(value?: string): string | null {
  if (!value) return null;
  const match = /^\/join\?invite=([0-9a-fA-F-]{36}\.[A-Za-z0-9_-]{43})$/.exec(value);
  return match ? `/join?invite=${match[1]}` : null;
}
