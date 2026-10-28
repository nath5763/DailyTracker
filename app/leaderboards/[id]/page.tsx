import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberManager, RemoveMemberButton } from "@/components/member-manager";
import { SiteHeader } from "@/components/site-header";
import { ApiError, apiFetch } from "@/lib/api";
import { requireViewer } from "@/lib/auth";
import { formatScore } from "@/lib/format";
import type { Leaderboard } from "@/lib/types";

export const dynamic = "force-dynamic";
type Range = "today" | "7d" | "30d" | "all";

export default async function LeaderboardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  await requireViewer();
  const { id } = await params;
  const query = await searchParams;
  const range: Range = (["today", "7d", "30d", "all"].includes(query.range ?? "") ? query.range : "today") as Range;
  let board: Leaderboard;
  try { board = await apiFetch<Leaderboard>(`/leaderboards/${id}?range=${range}&game=fermi`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const tabs: { key: Range; label: string }[] = [{ key: "today", label: "Today" }, { key: "7d", label: "Last 7 days" }, { key: "30d", label: "Last 30 days" }, { key: "all", label: "All time" }];
  return <main className="app-shell"><SiteHeader /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">FERMI LEADERBOARD</p><h1>{board.name}</h1></div><p>{board.members.length} player{board.members.length === 1 ? "" : "s"} · Lower average wins.</p></div>
    <div className="grid score-layout"><section className="card"><div className="tabs">{tabs.map((tab) => <Link className={`tab ${range === tab.key ? "active" : ""}`} href={`/leaderboards/${id}?range=${tab.key}`} key={tab.key}>{tab.label}</Link>)}</div>
      {board.rankings.length ? <div className="list">{board.rankings.map((row) => <Link className="list-row" href={`/profile/${row.shareId}`} key={row.userId}><span className="rank">{String(row.rank).padStart(2, "0")}</span><span>{row.displayName}<small>{row.gamesPlayed} score{row.gamesPlayed === 1 ? "" : "s"} in this range</small></span><strong>{formatScore(row.average)}</strong></Link>)}{board.absent.map((member) => <div className="list-row" key={member.userId}><span className="rank">—</span><span>{member.displayName}<small>Not played</small></span><strong>—</strong></div>)}</div> : <div className="empty">Nobody has posted a score for this range yet.</div>}
    </section><aside className="card">{board.owner ? <><h2>Manage players</h2><p className="subtle">Add an existing account using its exact UUID.</p><MemberManager leaderboardId={id} /><div className="spacer" /><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: member.avatarColor }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}<small>{member.owner ? "Owner" : "Member"}</small></span>{!member.owner ? <RemoveMemberButton leaderboardId={id} userId={member.userId} /> : <strong>★</strong>}</div>)}</div></> : <><h2>Club roster</h2><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: member.avatarColor }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}</span><strong>{member.owner ? "Owner" : ""}</strong></div>)}</div></>}</aside></div>
  </section></main>;
}
