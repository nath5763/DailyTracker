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

export type ParseResult =
  | { ok: true; value: ParsedSubmission }
  | { ok: false; errors: string[] };

export interface GameAdapter {
  slug: string;
  parseShareText(rawText: string): ParseResult;
  validate(value: ParsedSubmission): string[];
  formatScore(score: number): string;
  compare(left: number, right: number): number;
  aggregate(scores: number[]): number | null;
}

export type Profile = {
  user_id: string;
  share_id: string;
  display_name: string;
  avatar_color: string;
  created_at: string;
};
