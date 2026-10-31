import Link from "next/link";
import { notFound } from "next/navigation";
import { ManageBillingButton, SubscribeButton } from "@/components/billing-actions";
import { CopyLeaderboard } from "@/components/copy-leaderboard";
import { MemberManager, RemoveMemberButton } from "@/components/member-manager";
import { SiteHeader } from "@/components/site-header";
import { ApiError, apiFetch } from "@/lib/api";
import { requireViewer } from "@/lib/auth";
import { formatScore } from "@/lib/format";
import type { BillingStatus, BoardSummary, Game, Leaderboard } from "@/lib/types";

export const dynamic = "force-dynamic";
type Range = "today" | "7d" | "30d" | "all";

export default async function LeaderboardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  await requireViewer();
  const { id } = await params;
  const query = await searchParams;
  const range: Range = (["today", "7d", "30d", "all"].includes(query.range ?? "") ? query.range : "today") as Range;
  let board: Leaderboard;
  try {
    board = await apiFetch<Leaderboard>(`/leaderboards/${id}?range=${range}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 402) return <LockedLeaderboard id={id} />;
    throw error;
  }
  const games = await apiFetch<Game[]>("/games");
  const tabs: { key: Range; label: string }[] = [{ key: "today", label: "Today" }, { key: "7d", label: "Last 7 days" }, { key: "30d", label: "Last 30 days" }, { key: "all", label: "All time" }];
  const scoring = board.game.rankingDirection === "lower" ? "Lower average wins." : "Higher average wins.";

  return <main className="app-shell"><SiteHeader /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">{board.game.name.toUpperCase()} LEADERBOARD</p><h1>{board.name}</h1></div><p>{board.members.length} player{board.members.length === 1 ? "" : "s"} · {scoring} <a className="secondary-link" href={board.game.sourceUrl} rel="noreferrer" target="_blank">Play {board.game.name}</a></p></div>
    <div className="grid score-layout"><section className="card"><div className="tabs">{tabs.map((tab) => <Link className={`tab ${range === tab.key ? "active" : ""}`} href={`/leaderboards/${id}?range=${tab.key}`} key={tab.key}>{tab.label}</Link>)}</div>
      {board.rankings.length ? <div className="list">{board.rankings.map((row) => <Link className="list-row" href={`/profile/${row.shareId}`} key={row.userId}><span className="rank">{String(row.rank).padStart(2, "0")}</span><span>{row.displayName}<small>{row.gamesPlayed} score{row.gamesPlayed === 1 ? "" : "s"} in this range</small></span><strong>{formatScore(row.average, board.game.scoreFormat)}</strong></Link>)}{board.absent.map((member) => <div className="list-row" key={member.userId}><span className="rank">--</span><span>{member.displayName}<small>Not played</small></span><strong>--</strong></div>)}</div> : <div className="empty">Nobody has posted a score for this range yet.</div>}
    </section><aside className="card" id="leaderboard-roster-management">{board.owner ? <><h2>Manage players</h2><p className="subtle">Add an existing account using its exact UUID.</p><MemberManager leaderboardId={id} /><div className="spacer" /><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: member.avatarColor }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}<small>{member.owner ? "Owner" : "Member"}</small></span>{!member.owner ? <RemoveMemberButton leaderboardId={id} userId={member.userId} /> : <strong>★</strong>}</div>)}</div></> : <><h2>Club roster</h2><div className="list">{board.members.map((member) => <div className="list-row" key={member.userId}><span className="avatar small" style={{ background: member.avatarColor }}>{member.displayName[0].toUpperCase()}</span><span>{member.displayName}</span><strong>{member.owner ? "Owner" : ""}</strong></div>)}</div></>}</aside></div>
    <div className="spacer" /><section className="card" id="leaderboard-roster-copy"><h2>Use this group for another game</h2><p className="subtle">Create a new leaderboard with the same players. You will own the new board.</p><CopyLeaderboard leaderboardId={id} sourceName={board.name} sourceGameSlug={board.game.slug} games={games} /></section>
  </section></main>;
}

async function LockedLeaderboard({ id }: { id: string }) {
  const boards = await apiFetch<BoardSummary[]>("/leaderboards");
  const board = boards.find((candidate) => candidate.id === id);
  if (!board) notFound();
  const billing = board.owner ? await apiFetch<BillingStatus>("/billing/status") : null;
  return <main className="app-shell"><SiteHeader /><section className="page shell"><div className="page-heading"><div><p className="section-number">{board.game.name.toUpperCase()} LEADERBOARD</p><h1>{board.name}</h1></div></div><section className="card locked-card"><span className="lock-mark" aria-hidden="true">LOCKED</span><h2>This leaderboard is currently locked.</h2><p>{board.owner ? "Restore your unlimited leaderboard subscription to reopen its rankings and roster for everyone." : "The owner needs to restore their subscription before members can view rankings or the roster."}</p>{board.owner ? <div className="billing-buttons" id="locked-board-billing-controls"><SubscribeButton />{billing?.status ? <ManageBillingButton /> : null}</div> : null}<Link className="text-button" href="/leaderboards">Back to all leaderboards</Link></section></section></main>;
}
