import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberManager, RemoveMemberButton } from "@/components/member-manager";
import { SiteHeader } from "@/components/site-header";
import { requireViewer } from "@/lib/auth";
import { shiftDate, todayInTimeZone } from "@/lib/dates";
import { rankScores } from "@/lib/leaderboards";

export const dynamic = "force-dynamic";
type Range = "today" | "7d" | "30d" | "all";

export default async function LeaderboardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const range: Range = (["today", "7d", "30d", "all"].includes(query.range ?? "") ? query.range : "today") as Range;
  const { supabase, profile } = await requireViewer();
  const { data: board } = await supabase!.from("leaderboards").select("id,name,owner_id").eq("id", id).maybeSingle();
  if (!board) notFound();
  const { data: membershipRows } = await supabase!.from("leaderboard_members").select("user_id,profiles(user_id,share_id,display_name,avatar_color)").eq("leaderboard_id", id);
  const members = (membershipRows ?? []).flatMap((row: any) => { const member = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles; return member ? [member] : []; });
  const today = todayInTimeZone();
  let scoresQuery = supabase!.from("submissions").select("user_id,primary_score,played_on,games!inner(slug)").in("user_id", members.map((member: any) => member.user_id)).eq("games.slug", "fermi");
  if (range === "today") scoresQuery = scoresQuery.eq("played_on", today);
  if (range === "7d") scoresQuery = scoresQuery.gte("played_on", shiftDate(today, -6)).lte("played_on", today);
  if (range === "30d") scoresQuery = scoresQuery.gte("played_on", shiftDate(today, -29)).lte("played_on", today);
  const { data: scores } = await scoresQuery;
  const rankings = rankScores(members.map((member: any) => ({ userId: member.user_id, displayName: member.display_name, scores: (scores ?? []).filter((score: any) => score.user_id === member.user_id).map((score: any) => Number(score.primary_score)) })));
  const rankedUsers = new Set(rankings.map((row) => row.userId));
  const absent = range === "today" ? members.filter((member: any) => !rankedUsers.has(member.user_id)) : [];
  const owner = board.owner_id === profile.user_id;
  const tabs: { key: Range; label: string }[] = [{ key: "today", label: "Today" }, { key: "7d", label: "Last 7 days" }, { key: "30d", label: "Last 30 days" }, { key: "all", label: "All time" }];

  return <main className="app-shell"><SiteHeader /><section className="page shell"><div className="page-heading"><div><p className="section-number">FERMI LEADERBOARD</p><h1>{board.name}</h1></div><p>{members.length} player{members.length === 1 ? "" : "s"} · Lower average wins.</p></div><div className="grid score-layout"><section className="card"><div className="tabs">{tabs.map((tab) => <Link className={`tab ${range === tab.key ? "active" : ""}`} href={`/leaderboards/${id}?range=${tab.key}`} key={tab.key}>{tab.label}</Link>)}</div>{rankings.length ? <div className="list">{rankings.map((row) => { const member = members.find((item: any) => item.user_id === row.userId); return <Link className="list-row" href={`/profile/${member?.share_id}`} key={row.userId}><span className="rank">{String(row.rank).padStart(2, "0")}</span><span>{row.displayName}<small>{row.gamesPlayed} score{row.gamesPlayed === 1 ? "" : "s"} in this range</small></span><strong>{row.average.toFixed(2)}×</strong></Link>; })}{absent.map((member: any) => <div className="list-row" key={member.user_id}><span className="rank">—</span><span>{member.display_name}<small>Not played</small></span><strong>—</strong></div>)}</div> : <div className="empty">Nobody has posted a score for this range yet.</div>}</section><aside className="card">{owner ? <><h2>Manage players</h2><p className="subtle">Add an existing account using its exact UUID.</p><MemberManager leaderboardId={id} /><div className="spacer" /><div className="list">{members.map((member: any) => <div className="list-row" key={member.user_id}><span className="avatar small" style={{ background: member.avatar_color }}>{member.display_name[0].toUpperCase()}</span><span>{member.display_name}<small>{member.user_id === board.owner_id ? "Owner" : "Member"}</small></span>{member.user_id !== board.owner_id ? <RemoveMemberButton leaderboardId={id} userId={member.user_id} /> : <strong>★</strong>}</div>)}</div></> : <><h2>Club roster</h2><div className="list">{members.map((member: any) => <div className="list-row" key={member.user_id}><span className="avatar small" style={{ background: member.avatar_color }}>{member.display_name[0].toUpperCase()}</span><span>{member.display_name}</span><strong>{member.user_id === board.owner_id ? "Owner" : ""}</strong></div>)}</div></>}</aside></div></section></main>;
}
