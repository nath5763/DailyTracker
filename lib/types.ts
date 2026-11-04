export type ParsedSubmission = {
  puzzleKey: string;
  puzzleNumber?: number | null;
  playedOn: string;
  primaryScore: number;
  metrics: Record<string, unknown>;
  parserVersion: number;
};

export type Profile = {
  userId: string;
  shareId: string;
  displayName: string;
  avatarColor: string;
  createdAt: string;
};

export type User = { id: string; email: string };
export type Me = { user: User; profile: Profile | null };
export type Stats = { average: number | null; best: number | null; currentStreak: number; results: number };
export type ScoreFormat = { prefix: string; suffix: string; minimumDecimalPlaces: number; maximumDecimalPlaces: number; kind?: "number" | "guesses" | "duration" };
export type SubmissionConfig = {
  exampleShareText: string;
  puzzleLabel: string;
  scoreLabel: string;
  scoreMin: number;
  scoreMax: number | null;
  scoreStep: number;
  editableFields: string[];
};
export type Game = {
  id: string;
  slug: string;
  name: string;
  sourceUrl: string;
  rankingDirection: "lower" | "higher";
  scoreFormat: ScoreFormat;
  submission: SubmissionConfig;
};
export type CatalogGame = { slug: string; name: string; description: string; category: string; sourceUrl: string; scoreTrackingAvailable: boolean };
export type Score = { id: string; puzzleKey: string; playedOn: string; primaryScore: number; gameName: string; gameSlug: string; game: Game; metrics?: Record<string, unknown> };
export type BoardSummary = { id: string; name: string; ownerId: string; owner: boolean; game: Game | null; boardType: "SINGLE_GAME" | "MULTI_GAME"; games: Game[]; locked: boolean; createdAt: string };
export type GameStats = Stats & { game: Game };
export type Dashboard = { profile: Profile; stats: Stats; statsByGame: GameStats[]; recentScores: Score[]; leaderboards: BoardSummary[] };
export type Member = { userId: string; shareId: string; displayName: string; avatarColor: string; owner: boolean };
export type Ranking = { rank: number; userId: string; shareId: string; displayName: string; average: number; gamesPlayed: number; assistedResults?: number; unknownAssistanceResults?: number; hints?: number; mistakes?: number; beginnerAssists?: number };
export type Leaderboard = { id: string; name: string; ownerId: string; game: Game; boardType: "SINGLE_GAME" | "MULTI_GAME"; games: Game[]; range: string; owner: boolean; members: Member[]; rankings: Ranking[]; absent: Member[] };
export type PlayerProfile = { profile: Profile; self: boolean; stats: Stats; statsByGame: GameStats[]; scores: Score[] };
export type BillingTier = "FREE" | "STANDARD" | "PREMIUM";
export type BillingStatus = { tier: BillingTier; singleGameCount: number; singleGameLimit: number; allGameCount: number; allGameLimit: number; status: string | null; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null; graceUntil: string | null };
export type DiscordStatus = { configured: boolean; linked: boolean; linkedAt: string | null; installUrl: string | null };
export type DiscordLinkCode = { code: string; expiresAt: string };
