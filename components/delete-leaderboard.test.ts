import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { DeleteLeaderboard, leaderboardNameMatches } from "./delete-leaderboard";

vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "owner" }) }));
vi.mock("@/components/app-link", () => ({ navigateInApp: vi.fn() }));
vi.mock("@/lib/client-cache", () => ({ invalidateClientCachePrefix: vi.fn() }));

test("requires the exact leaderboard name", () => {
  expect(leaderboardNameMatches("Friday Friends", "Friday Friends")).toBe(true);
  expect(leaderboardNameMatches("Friday Friends", "friday friends")).toBe(false);
  expect(leaderboardNameMatches("Friday Friends", " Friday Friends ")).toBe(false);
});

test("explains permanent deletion and initially disables the action", () => {
  const html = renderToStaticMarkup(createElement(DeleteLeaderboard, { boardId: "board", name: "Friday Friends" }));
  expect(html).toContain("DANGER ZONE");
  expect(html).toContain("Player score history will not be deleted");
  expect(html).toContain("Type <strong>Friday Friends</strong> to confirm");
  expect(html).toContain("Delete permanently");
  expect(html).toContain("disabled");
});
