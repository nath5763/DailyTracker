import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Discord Setup Guide",
  description: "Connect Daily Club leaderboards to Discord server channels, DMs, and Group DMs.",
};
export const dynamic = "force-dynamic";

export default async function DiscordGuidePage() {
  const viewer = await getViewer();
  const profileHref = viewer.profile ? `/profile/${viewer.profile.shareId}` : viewer.user ? "/onboarding" : "/auth";
  const userInstallUrl = process.env.NEXT_PUBLIC_DISCORD_USER_INSTALL_URL?.trim();

  return <main className="app-shell">
    <SiteHeader viewer={viewer} />
    <section className="page shell">
      <div className="page-heading discord-guide-intro"><div><p className="section-number">DISCORD SETUP GUIDE</p><h1>Bring your leaderboard to Discord.</h1></div></div>
      <p className="discord-guide-intro">Daily Tracker supports server channels, direct messages, and Group DMs. Every participant must link their own Discord account and already belong to the Daily Club leaderboard before using commands.</p>

      <div className="discord-guide-grid">
        <article className="card discord-guide-card"><p className="section-number">SERVER CHANNELS</p><h2>Connect an existing channel</h2><p className="discord-access-note"><strong>Paid owner feature.</strong> The leaderboard owner needs an active paid plan; other members do not.</p><ol>
          <li>The leaderboard owner links their Discord identity from their Profile.</li>
          <li>The owner needs a paid Daily Club plan and <strong>Manage Server</strong> permission in Discord.</li>
          <li>Open a leaderboard you own and select <strong>Add leaderboard to Discord</strong>.</li>
          <li>Authorize the Daily Tracker app and bot for the server.</li>
          <li>Select an existing text channel to connect it to the leaderboard.</li>
        </ol><div className="discord-guide-actions"><a className="button" href="/leaderboards" target="_blank" rel="noopener noreferrer">Start server setup <span aria-hidden="true">↗</span></a><a className="secondary-link" href="/pricing" target="_blank" rel="noopener noreferrer">Compare paid plans ↗</a></div></article>
        <article className="card discord-guide-card"><p className="section-number">GROUP DMS</p><h2>Configure a private chat</h2><p className="discord-access-note"><strong>No subscription required.</strong> Every member can link their profile and install the user app.</p><ol>
          <li>Install the Daily Tracker user app from your Profile.</li>
          <li>Open the leaderboard and copy its leaderboard UUID from the Discord channels section.</li>
          <li>In the Group DM, the leaderboard owner runs <code>/set-leaderboard leaderboard:&lt;UUID&gt;</code> once.</li>
        </ol><div className="discord-guide-actions">{userInstallUrl ? <a className="button" href={userInstallUrl} target="_blank" rel="noopener noreferrer">Install the user app <span aria-hidden="true">↗</span></a> : null}<a className={userInstallUrl ? "secondary-link" : "button"} href={profileHref} target="_blank" rel="noopener noreferrer">Open Profile setup ↗</a></div></article>
      </div>

      <section className="discord-guide-section"><h2>Subscriptions and account controls</h2><p>Discord identity linking, user-app installation, and commands in DMs or Group DMs are available without a paid plan. A subscription is required only for a leaderboard owner who connects that leaderboard to a Discord server channel. View the current plan, subscribe, or open billing controls from your Profile.</p><div className="discord-guide-actions"><a className="button button-ghost" href={profileHref} target="_blank" rel="noopener noreferrer">Open Profile and billing <span aria-hidden="true">↗</span></a></div></section>

      <section className="discord-guide-section"><h2>Using commands</h2><ul>
        <li>Use <code>/daily</code> to submit a supported result. On a single-game leaderboard, the game is already known; on an all-games leaderboard, choose the game requested by the command.</li>
        <li>Use <code>/leaderboard</code> to view the current standings.</li>
        <li>In an unconfigured DM or Group DM, provide the leaderboard UUID when the command asks for the <code>leaderboard</code> option.</li>
      </ul></section>

      <section className="discord-guide-section"><h2>Permissions and membership</h2><p>If setup says you lack permission, confirm that the Discord account linked to your Profile has Manage Server permission and that you are the Daily Club leaderboard owner. If a command says you are not a member, link the Discord account you are currently using and ask the owner to add your Daily Club account to the leaderboard first.</p></section>

      <section className="card discord-guide-section"><h2>Group DM privacy</h2><p>Daily Tracker is not a permanent participant in a Group DM. It responds only when someone explicitly uses an app command, and it does not passively read or parse the chat&apos;s messages.</p></section>
    </section>
  </main>;
}
