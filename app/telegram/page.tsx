import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Telegram Setup Guide" };
export const dynamic = "force-dynamic";

export default async function TelegramGuidePage() {
  const viewer = await getViewer();
  const profileHref = viewer.profile ? `/profile/${viewer.profile.shareId}` : viewer.user ? "/onboarding" : "/auth";
  return <main className="app-shell"><SiteHeader viewer={viewer} /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">TELEGRAM SETUP GUIDE</p><h1>Bring your leaderboard to Telegram</h1></div></div>
    <p className="discord-guide-intro">The bot works in private chats, groups, and supergroups. It responds to commands and inline choices and ignores ordinary group conversation.</p>
    <div className="discord-guide-grid">
      <article className="card discord-guide-card"><h2>Link your account</h2><ol>
        <li>Open your Profile and create a one-time Telegram link code.</li>
        <li>Start a private chat with the bot, send <code>/link</code>, and paste the code.</li>
        <li>Use <code>/daily</code> to submit a game share and <code>/leaderboard</code> to see rankings. The bot offers choices for the board, game, and date range.</li>
      </ol><div className="discord-guide-actions"><a className="button" href={profileHref}>Open Profile</a></div></article>
      <article className="card discord-guide-card"><h2>Connect a group</h2><p className="discord-access-note"><strong>Paid owner feature.</strong> The leaderboard owner needs an active paid plan; linked members can use the group regardless of their tier.</p><ol>
        <li>Create a multi-game leaderboard and open its page.</li>
        <li>Copy its Telegram setup command and add the bot to your group.</li>
        <li>As a group administrator and board owner, run the setup command in that group. The current board owner can replace or disconnect it later.</li>
        <li>Keep the bot&apos;s group privacy mode enabled in BotFather. The bot acts on commands and button presses and ignores unrelated messages.</li>
      </ol><div className="discord-guide-actions"><Link className="button" href="/leaderboards">Open leaderboards</Link></div></article>
    </div>
    <section className="discord-guide-section"><h2>Signup from a group</h2><p>Run <code>/signup</code> in a connected group. Open the private bot link it returns, then create an account or sign in on the website. Confirm your identity using the button sent to your private bot chat. The continuation works once and expires after 24 hours. You join the original leaderboard only if the group still points to it and its owner has access.</p></section>
    <section className="discord-guide-section"><h2>Commands</h2><p><code>/daily</code> and <code>/loldle</code> collect share text privately and post a score confirmation to the selected chat. <code>/leaderboard</code> offers game and range buttons and posts up to ten rankings. Use <code>/my_id</code> to get your account UUID. Owners can use <code>/add_member</code>, <code>/setup</code>, <code>/set_leaderboard</code>, and <code>/unset_leaderboard</code>. Telegram&apos;s command menu uses underscores; the bot also accepts typed hyphen variants.</p></section>
  </section></main>;
}
