import { LeaderboardDetail } from "@/components/leaderboard-detail";

export default async function LeaderboardPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ game?: string; range?: string }>;
}) {
  const { id } = await params;
  const { game, range } = await searchParams;
  return <LeaderboardDetail id={id} requestedGame={game} requestedRange={range} />;
}
