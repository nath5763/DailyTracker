import { expect, test } from "vitest";
import { leaderboardInviteMessage, leaderboardResultsMessage, leaderboardUrl, whatsappUrl } from "./whatsapp-share";
import type { Leaderboard } from "./types";

const board = {
  id: "board-id", name: "Friday Friends", range: "7d", boardType: "SINGLE_GAME", ownerId: "owner-id", owner: false,
  game: { id: "game-id", slug: "fermi", name: "Fermi", sourceUrl: "https://fermi.gg", rankingDirection: "lower",
    scoreFormat: { prefix: "", suffix: "×", minimumDecimalPlaces: 2, maximumDecimalPlaces: 2 },
    submission: { exampleShareText: "", puzzleLabel: "", scoreLabel: "", scoreMin: 0, scoreMax: null, scoreStep: 1, editableFields: [] },
    manualEntry: { supported: false, puzzleIdRequired: false, completionStatuses: [], fields: [] } },
  games: [], members: [], absent: [], rankings: [
    { rank: 1, userId: "profile-uuid-1", shareId: "share-1", displayName: "Ava", average: 1.2, gamesPlayed: 2 },
    { rank: 2, userId: "profile-uuid-2", shareId: "share-2", displayName: "Ben", average: 2.3, gamesPlayed: 2, displayScore: "2.30 pts" },
    { rank: 3, userId: "profile-uuid-3", shareId: "share-3", displayName: "Cam", average: 3.4, gamesPlayed: 2 },
    { rank: 4, userId: "profile-uuid-4", shareId: "share-4", displayName: "Dee", average: 4.5, gamesPlayed: 2 },
  ],
} as Leaderboard;

test("shares the selected game and range with only the first three formatted rankings", () => {
  const url = leaderboardUrl(board, "https://daily.club");
  expect(url).toBe("https://daily.club/leaderboards/board-id?game=fermi&range=7d");
  const message = leaderboardResultsMessage(board, url);
  expect(message).toBe("Friday Friends — Fermi leaderboard (Last 7 days)\n#1 Ava: 1.2×\n#2 Ben: 2.3 pts\n#3 Cam: 3.4×\n" + url);
  expect(message).not.toContain("Dee");
  expect(message).not.toContain("profile-uuid");
  expect(message).not.toContain("share-1");
});

test("describes an empty ranking and encodes the entire message for WhatsApp", () => {
  const empty = { ...board, range: "today", rankings: [] };
  const message = leaderboardResultsMessage(empty, leaderboardUrl(empty, "https://daily.club"));
  expect(message).toContain("Fermi leaderboard (Today)\nNo scores have been posted yet.\n");
  const destination = whatsappUrl(message);
  expect(destination).toBe(`https://wa.me/?text=${encodeURIComponent(message)}`);
  expect(new URL(destination).searchParams.get("text")).toBe(message);
});

test("encodes the current server-issued invite URL", () => {
  const first = "https://daily.club/join?invite=first.token";
  const regenerated = "https://daily.club/join?invite=second.token";
  expect(new URL(whatsappUrl(leaderboardInviteMessage(first))).searchParams.get("text")).toContain(first);
  expect(new URL(whatsappUrl(leaderboardInviteMessage(regenerated))).searchParams.get("text")).toContain(regenerated);
  expect(leaderboardInviteMessage(regenerated)).not.toContain(first);
});
