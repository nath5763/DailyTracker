import Link from "next/link";
import { CreateLeaderboard } from "@/components/create-leaderboard";
import { SiteHeader } from "@/components/site-header";
import { requireViewer } from "@/lib/auth";

export const metadata = { title: "Leaderboards" };
export const dynamic = "force-dynamic";

export default async function LeaderboardsPage() {
  const { supabase, profile } = await requireViewer();
  const { data } = await supabase!.from("leaderboard_members").select("leaderboard_id,leaderboards(id,name,owner_id,created_at)").eq("user_id", profile.user_id);
  const groups = (data ?? []).flatMap((item: any) => { const board = Array.isArray(item.leaderboards) ? item.leaderboards[0] : item.leaderboards; return board ? [board] : []; });
  return <main className="app-shell"><SiteHeader /><section className="page shell"><div className="page-heading"><div><p className="section-number">PRIVATE CLUBS</p><h1>Your leaderboards.</h1></div><p>Each group is visible only to its members. Owners manage the roster with account UUIDs.</p></div><div className="grid grid-2"><section className="card"><h2>All groups</h2>{groups.length ? <div className="list">{groups.map((board: any) => <Link className="list-row" href={`/leaderboards/${board.id}`} key={board.id}><span className="rank">↗</span><span>{board.name}<small>{board.owner_id === profile.user_id ? "Owner" : "Member"}</small></span><strong>Open</strong></Link>)}</div> : <div className="empty">No leaderboards yet.</div>}</section><section className="card card-lime"><h2>Start another club</h2><p>Keep work friends, family, and the ultra-competitive people in separate tables.</p><CreateLeaderboard /></section></div></section></main>;
}
