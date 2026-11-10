import Link from "next/link";

export function DiscordLinkInstructions({ afterJoin = false }: { afterJoin?: boolean }) {
  return <section className="card" aria-label="Connect Discord">
    <h2>{afterJoin ? "Joined! Want to use Discord too?" : "Want to use Discord too?"}</h2>
    <p>Connecting Discord is optional. Your leaderboard membership works without it.</p>
    <ol>
      <li>{afterJoin ? "Open" : "After joining, open"} the <strong>Discord</strong> section on your {afterJoin ? <Link href="/dashboard">dashboard</Link> : "dashboard"} and select <strong>Generate link code</strong>.</li>
      <li>Within 10 minutes, run <code>/link code:&lt;code&gt;</code> from your Discord account in a server where Daily Tracker is installed.</li>
    </ol>
    <p>Once linked, you can use <code>/daily</code> with a required game selection in a channel connected to a multi-game leaderboard.</p>
  </section>;
}
