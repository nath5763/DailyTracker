export type ParsedSubmission = {
  puzzleKey: string;
  puzzleNumber: number;
  playedOn: string;
  primaryScore: number;
  metrics: {
    percentile?: number;
    components?: number[];
  };
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
export type Score = { id: string; puzzleKey: string; playedOn: string; primaryScore: number; gameName: string; gameSlug: string };
export type BoardSummary = { id: string; name: string; ownerId: string; owner: boolean; createdAt: string };
export type Dashboard = { profile: Profile; stats: Stats; recentScores: Score[]; leaderboards: BoardSummary[] };
export type Member = { userId: string; shareId: string; displayName: string; avatarColor: string; owner: boolean };
export type Ranking = { rank: number; userId: string; shareId: string; displayName: string; average: number; gamesPlayed: number };
export type Leaderboard = { id: string; name: string; ownerId: string; gameSlug: string; range: string; owner: boolean; members: Member[]; rankings: Ranking[]; absent: Member[] };
export type PlayerProfile = { profile: Profile; self: boolean; stats: Stats; scores: Score[] };
