import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { LeaderboardInviteActions } from "./leaderboard-invite";

function render(locked = false, url = "https://daily.club/join/example", busy = false, active = true) {
  return renderToStaticMarkup(createElement(LeaderboardInviteActions, {
    url, active, locked, busy,
    onCopy: vi.fn(), onRegenerate: vi.fn(), onRevoke: vi.fn(),
  }));
}

test("groups copy and regenerate while keeping revoke separate", () => {
  const html = render();
  expect(html).toMatch(/invite-primary-actions[^>]*>.*Copy invite link.*Regenerate link.*<\/div><div class="invite-destructive-action">/);
  expect(html).toContain("Revoke link");
  expect(html).toContain("Invite via WhatsApp");
  expect(html).toContain('target="_blank" rel="noopener noreferrer"');
});

test("keeps copy and revoke available without regenerate when locked", () => {
  const html = render(true);
  expect(html).toContain("Copy invite link");
  expect(html).toContain("Revoke link");
  expect(html).not.toContain("Regenerate link");
  expect(html).not.toContain("Invite via WhatsApp");
});

test("uses the latest invite URL and hides WhatsApp while regenerating", () => {
  const current = render(false, "https://daily.club/join?invite=second.token");
  expect(current).toContain(encodeURIComponent("https://daily.club/join?invite=second.token"));
  expect(current).not.toContain(encodeURIComponent("https://daily.club/join?invite=first.token"));
  expect(render(false, "https://daily.club/join?invite=first.token", true)).not.toContain("Invite via WhatsApp");
  expect(render(false, "https://daily.club/join?invite=first.token", false, false)).not.toContain("Invite via WhatsApp");
});
