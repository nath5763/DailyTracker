import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { LeaderboardInviteActions } from "./leaderboard-invite";

function render(locked = false) {
  return renderToStaticMarkup(createElement(LeaderboardInviteActions, {
    url: "https://daily.club/join/example", locked, busy: false,
    onCopy: vi.fn(), onRegenerate: vi.fn(), onRevoke: vi.fn(),
  }));
}

test("groups copy and regenerate while keeping revoke separate", () => {
  const html = render();
  expect(html).toMatch(/invite-primary-actions[^>]*>.*Copy invite link.*Regenerate link.*<\/div><div class="invite-destructive-action">/);
  expect(html).toContain("Revoke link");
});

test("keeps copy and revoke available without regenerate when locked", () => {
  const html = render(true);
  expect(html).toContain("Copy invite link");
  expect(html).toContain("Revoke link");
  expect(html).not.toContain("Regenerate link");
});
