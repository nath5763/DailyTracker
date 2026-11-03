import { LeaderboardsView } from "@/components/leaderboards-view";

export const metadata = { title: "Leaderboards" };

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const query = await searchParams;
  return <LeaderboardsView checkout={query.checkout} />;
}
