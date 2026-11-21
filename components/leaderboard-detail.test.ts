import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { LeaderboardDetail } from "./leaderboard-detail";

const state = vi.hoisted(() => ({ summaries: null as unknown, board: null as unknown,
  cachePathArgs: null as [string, string | undefined, string] | null }));

vi.mock("@/components/app-data-provider", () => ({ useAppData: () => ({ userId: "viewer" }) }));
vi.mock("@/components/copy-leaderboard", () => ({ CopyLeaderboard: () => null }));
vi.mock("@/components/member-manager", () => ({ MemberManager: () => null, RemoveMemberButton: () => null }));
vi.mock("@/components/billing-actions", () => ({ ManageBillingButton: () => null, SubscribeButton: () => null,
  SubscriptionChoices: () => null }));
vi.mock("@/lib/client-cache", () => ({
  leaderboardCachePath: (...args: [string, string | undefined, string]) => {
    state.cachePathArgs = args;
    return "/board-detail";
  },
  leaderboardMemberScoresCachePath: vi.fn(),
  invalidateClientCachePrefix: vi.fn(),
  useCachedApi: (path: string) => ({
    data: path === "/leaderboards" ? state.summaries : path === "/board-detail" ? state.board : null,
    error: null, errorStatus: null, refresh: vi.fn(),
  }),
}));

const game = { id: "game", slug: "fermi", name: "Fermi", sourceUrl: "https://fermi.gg",
  rankingDirection: "lower", scoreFormat: { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 } };
const summary = { id: "board", name: "Friends", ownerId: "owner", owner: false, game, games: [game],
  boardType: "SINGLE_GAME", locked: false };

function render(props: { requestedRange?: string } = {}) {
  return renderToStaticMarkup(createElement(LeaderboardDetail, { id: "board", ...props }));
}
afterEach(() => vi.unstubAllGlobals());
function expectBackLink(html: string) {
  expect(html).toContain('href="/leaderboards"');
  expect(html).toContain("Back to all leaderboards");
}

test("shows a back button on normal and locked leaderboards", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [], rankings: [], absent: [], range: "today" };
  expectBackLink(render());
  state.summaries = [{ ...summary, locked: true }];
  expectBackLink(render());
});

test("explains that Discord connections require a multi-game leaderboard", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [], rankings: [], absent: [], range: "today" };
  const html = render();
  expect(html).toContain("Discord requires a multi-game leaderboard");
  expect(html).not.toContain("Add leaderboard to Discord");
});

test("shows Discord connection controls on multi-game leaderboards", () => {
  const multi = { ...summary, boardType: "MULTI_GAME", owner: true };
  state.summaries = [multi];
  state.board = { ...multi, members: [], rankings: [], absent: [], range: "today" };
  const html = render();
  expect(html).toContain("Discord channels");
  expect(html).not.toContain("Discord requires a multi-game leaderboard");
});

test("shows a back button while loading and when a leaderboard is unavailable", () => {
  state.summaries = null;
  state.board = null;
  expectBackLink(render());
  state.summaries = [];
  expectBackLink(render());
});

test("shows position, full rankings, then progress", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [{ userId: "viewer", displayName: "Viewer", avatarColor: "#dfff4f", owner: false }],
    rankings: [{ rank: 1, userId: "viewer", shareId: "viewer-share", displayName: "Viewer", average: 10, gamesPlayed: 1 }],
    absent: [], range: "today" };
  const html = render();
  expect(html.indexOf("YOUR POSITION")).toBeLessThan(html.indexOf("<h2>Leaderboard</h2>"));
  expect(html.indexOf("<h2>Leaderboard</h2>")).toBeLessThan(html.indexOf("Viewer"));
  expect(html.indexOf("Viewer")).toBeLessThan(html.indexOf("<h2>Progress</h2>"));
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Share Results");
  expect(html).toContain("Share results to WhatsApp");
  expect(html).not.toContain('href="/profile/viewer-share"');
});

test("shows verified per-guess details on today's leaderboard", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [{ userId: "viewer", displayName: "Viewer", avatarColor: "#dfff4f", owner: false }],
    rankings: [{ rank: 1, userId: "viewer", shareId: "viewer-share", displayName: "Viewer", average: 1.5, gamesPlayed: 1 }],
    absent: [], range: "today", dailyResults: [{ userId: "viewer", puzzleKey: "7", details: [
      { label: "Q1", value: "1.20×" }, { label: "Q2", value: "1.40×" }, { label: "Q3", value: "2.10×" },
    ] }] };
  expect(render()).toContain("Q1 1.20× · Q2 1.40× · Q3 2.10×");
});

test("shows aggregate placement, score, participation, and the current player without changing order", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [
    { userId: "leader", displayName: "Leader", avatarColor: "#dfff4f", owner: false },
    { userId: "viewer", displayName: "Viewer", avatarColor: "#ff8db6", owner: false },
  ], rankings: [
    { rank: 1, userId: "leader", shareId: "leader-share", displayName: "Leader", average: 84,
      leaderboardPoints: 84, displayScore: "84 leaderboard pts", gamesPlayed: 2,
      averagePlacement: 1.5, averageScore: 23.75 },
    { rank: 2, userId: "viewer", shareId: "viewer-share", displayName: "Viewer", average: 64,
      leaderboardPoints: 64, displayScore: "64 leaderboard pts", gamesPlayed: 5,
      averagePlacement: 1.5, averageScore: 12 },
  ], absent: [], range: "7d" };
  const html = render({ requestedRange: "7d" });
  expect(state.cachePathArgs).toEqual(["board", "fermi", "7d"]);
  expect(html.indexOf("Leader")).toBeLessThan(html.indexOf("Viewer"));
  expect(html).toContain("#1.5");
  expect(html).toContain("23.8");
  expect(html).toContain("12.0");
  expect(html).toContain("2 results submitted");
  expect(html).toContain("5 results submitted");
  expect(html).toContain("Avg. placement");
  expect(html).toContain("Avg. score");
  expect(html).toContain("Results played");
  expect(html).toContain("current-user-row");
  expect(html).not.toContain("leaderboard pts");
});

test("keeps today's raw result presentation and handles missing aggregate metrics", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [], rankings: [
    { rank: 1, userId: "viewer", shareId: "viewer-share", displayName: "Viewer", average: 10,
      gamesPlayed: 1, displayScore: "10.00×" },
  ], absent: [], range: "today" };
  const today = render();
  expect(today).toContain("10.00×");
  expect(today).not.toContain("Avg. placement");

  state.board = { ...state.board as object, range: "30d", rankings: [
    { rank: 1, userId: "viewer", shareId: "viewer-share", displayName: "Viewer", average: 84,
      leaderboardPoints: 84, displayScore: "84 leaderboard pts", gamesPlayed: 1 },
  ] };
  const aggregate = render({ requestedRange: "30d" });
  expect(aggregate).toContain("Avg. placement");
  expect(aggregate).toContain("Avg. score");
  expect(aggregate).toContain("—");
  expect(aggregate).not.toContain("84 leaderboard pts");
});

test("keeps the leaderboard section visible when no one has scored", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [], rankings: [], absent: [], range: "today" };
  const html = render();
  expect(html.indexOf("YOUR POSITION")).toBeLessThan(html.indexOf("<h2>Leaderboard</h2>"));
  expect(html.indexOf("<h2>Leaderboard</h2>")).toBeLessThan(html.indexOf("Nobody has posted a score"));
  expect(html.indexOf("Nobody has posted a score")).toBeLessThan(html.indexOf("<h2>Progress</h2>"));
});

test("keeps member roster management owner-only", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [{ userId: "viewer", displayName: "Viewer", avatarColor: "#dfff4f", owner: false }], rankings: [], absent: [], range: "today" };
  const memberHtml = render();
  expect(memberHtml).toContain("Club roster");
  expect(memberHtml).not.toContain("Manage players");
  expect(memberHtml).not.toContain("Invite players");
  expect(memberHtml).not.toContain("Add an existing account");
  expect(memberHtml).not.toContain("Delete leaderboard");

  state.summaries = [{ ...summary, owner: true }];
  state.board = { ...state.board as object, owner: true };
  const ownerHtml = render();
  expect(ownerHtml).toContain("Manage players");
  expect(ownerHtml).toContain("Invite players");
  expect(ownerHtml).toContain("Add an existing account");
  expect(ownerHtml).toContain("Delete leaderboard");
});

test("lets only the owner delete a locked leaderboard", () => {
  state.board = null;
  state.summaries = [{ ...summary, locked: true, owner: false }];
  expect(render()).not.toContain("Delete leaderboard");
  state.summaries = [{ ...summary, locked: true, owner: true }];
  expect(render()).toContain("Delete leaderboard");
});

test("lets the API choose the most recently played game for an all-game board", () => {
  const krillion = { ...game, id: "krillion", slug: "krillion", name: "Krillion", rankingDirection: "higher" };
  state.summaries = [{ ...summary, boardType: "MULTI_GAME", games: [game, krillion] }];
  state.board = { ...summary, boardType: "MULTI_GAME", members: [], rankings: [], absent: [], range: "today" };
  render();
  expect(state.cachePathArgs).toEqual(["board", undefined, "today"]);
});

test("restores the last selected game for each leaderboard", () => {
  const krillion = { ...game, id: "krillion", slug: "krillion", name: "Krillion", rankingDirection: "higher" };
  state.summaries = [{ ...summary, boardType: "MULTI_GAME", games: [game, krillion] }];
  state.board = { ...summary, boardType: "MULTI_GAME", game: krillion, games: [game, krillion], members: [], rankings: [], absent: [], range: "today" };
  vi.stubGlobal("window", { localStorage: { getItem: () => "krillion", setItem: vi.fn() } });
  render();
  expect(state.cachePathArgs).toEqual(["board", "krillion", "today"]);
});

test("keeps combined standings separate from selected-game score details", () => {
  state.summaries = [{ ...summary, boardType: "MULTI_GAME" }];
  const player = { rank: 1, userId: "player", shareId: "player-share", displayName: "Player", average: 10, gamesPlayed: 1 };
  state.board = { ...summary, boardType: "MULTI_GAME", members: [], rankings: [player], combinedRankings: [player], absent: [], range: "today" };
  const html = render();
  expect((html.match(/<button/g) ?? []).length).toBeGreaterThanOrEqual(3);
  expect((html.match(/aria-controls="player-scores-/g) ?? []).length).toBe(2);
  expect(html).toContain("ALL GAMES");
  expect(html.indexOf("<h2>Progress</h2>")).toBeLessThan(html.indexOf("<h2>Combined standings</h2>"));
  expect(html.indexOf('class="leaderboard-sidebar"')).toBeLessThan(html.indexOf("<h2>Combined standings</h2>"));
  expect(html.indexOf("<h2>Combined standings</h2>")).toBeLessThan(html.indexOf('id="leaderboard-roster-management"'));
  expect(html).not.toContain("player-scores-combined");
  expect(html).not.toContain('href="/profile/player-share"');
});

test("renders combined standings as normalized performance bars with authoritative result counts", () => {
  state.summaries = [{ ...summary, boardType: "MULTI_GAME" }];
  state.board = { ...summary, boardType: "MULTI_GAME", members: [], rankings: [], absent: [], range: "30d",
    combinedRankings: [
      { rank: 1, userId: "winner", shareId: "winner-share", displayName: "Winner", average: 92.75,
        leaderboardPoints: 92.75, participationPoints: 999, gamesPlayed: 60, manualResults: 4 },
      { rank: 2, userId: "runner-up", shareId: "runner-share", displayName: "Runner Up", average: 64,
        leaderboardPoints: 64, participationPoints: 1, gamesPlayed: 12, manualResults: 0 },
    ] };
  const html = render({ requestedRange: "30d" });
  expect(html).toContain("ALL GAMES · LAST 30 DAYS");
  expect(html).toContain("92.8");
  expect(html).toContain("64.0");
  expect(html).toContain('style="width:92.75%"');
  expect(html).toContain('style="width:64%"');
  expect(html).toContain("60 games played");
  expect(html).toContain("12 games played");
  expect(html).toContain("4 unverified");
  expect(html).toContain('aria-label="First place"');
  expect(html).toContain('aria-label="How combined performance is calculated"');
  expect(html).toContain("Failed results earn zero performance points.");
  expect(html).not.toContain("participation point");
  expect(html).not.toContain("These standings combine every game");
});

test("shows an empty combined standings state without invented scores", () => {
  state.summaries = [{ ...summary, boardType: "MULTI_GAME" }];
  state.board = { ...summary, boardType: "MULTI_GAME", members: [], rankings: [], combinedRankings: [], absent: [], range: "7d" };
  const html = render({ requestedRange: "7d" });
  expect(html).toContain("ALL GAMES · LAST 7 DAYS");
  expect(html).toContain("No combined results have been recorded for this range.");
  expect(html).not.toContain("combined-performance-track");
});

test("places sharing in its own sidebar card above the roster", () => {
  state.summaries = [summary];
  state.board = { ...summary, members: [], rankings: [], absent: [], range: "today" };
  const html = render();
  expect(html).toContain('class="leaderboard-game-toolbar"');
  expect(html).toContain('aria-labelledby="share-results-heading"');
  expect(html).toContain('aria-label="Share Fermi results"');
  expect(html.indexOf("leaderboard-range-tabs")).toBeLessThan(html.indexOf('class="leaderboard-sidebar"'));
  expect(html.indexOf('class="leaderboard-sidebar"')).toBeLessThan(html.indexOf("Share Results"));
  expect(html.indexOf("Share Results")).toBeLessThan(html.indexOf("Share results to WhatsApp"));
  expect(html.indexOf("Share results to WhatsApp")).toBeLessThan(html.indexOf('id="leaderboard-roster-management"'));
});
