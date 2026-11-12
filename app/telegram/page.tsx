import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { TelegramSymbol } from "@/components/telegram-symbol";

export const metadata = { title: "Telegram Setup Guide" };
export const dynamic = "force-dynamic";

export default async function TelegramGuidePage() {
  const viewer = await getViewer();
  const profileHref = viewer.profile ? `/profile/${viewer.profile.shareId}` : viewer.user ? "/onboarding" : "/auth";
  return <main className="app-shell"><SiteHeader viewer={viewer} /><section className="page shell">
    <div className="page-heading"><div><p className="section-number telegram-label"><TelegramSymbol />TELEGRAM SETUP GUIDE</p><h1>Bring your leaderboard to Telegram</h1></div></div>
    <p className="discord-guide-intro">First link your Daily Tracker profile to your Telegram identity. Then you can use the bot in a private chat or in a connected group. The bot responds to commands and button choices and ignores ordinary group conversation.</p>
    <div className="discord-guide-grid">
      <article className="card discord-guide-card"><h2 className="telegram-label"><TelegramSymbol />Link your account</h2><ol>
        <li>Sign in to Daily Tracker and finish setting up your profile. In the Telegram section of Profile, select <strong>Generate link code</strong>. The code can be used once and expires after 10 minutes.</li>
        <li>Select <strong>Open Telegram bot</strong> on Profile. In Telegram, start a private chat with the bot and send <code>/link</code>. Do not paste the code into a group.</li>
        <li>When the bot asks for the code, copy it from Profile and send it in that private chat. Wait for the bot to say your account is linked, then select <strong>Check link status</strong> on Profile.</li>
        <li>Send <code>/daily</code> to submit a supported game share result, or <code>/leaderboard</code> to see rankings. Follow the bot&apos;s buttons to choose a board, game, and date range.</li>
      </ol><div className="discord-guide-actions"><a className="button telegram-label" href={profileHref}><TelegramSymbol />Open Profile</a></div></article>
      <article className="card discord-guide-card"><h2 className="telegram-label"><TelegramSymbol />Connect a group</h2><p className="discord-access-note"><strong>Paid owner feature.</strong> The leaderboard owner needs an active paid plan; linked members can use the group regardless of their tier.</p><ol>
        <li>Link your own Telegram account using the steps on the left. Create a multi-game leaderboard on Daily Tracker and open that leaderboard&apos;s page.</li>
        <li>In its <strong>Telegram groups</strong> box, copy the <code>/setup</code> command and select <strong>Add bot to a group</strong>. Choose the Telegram group you administer.</li>
        <li>In that group, send the copied <code>/setup</code> command from your linked Telegram account. The bot confirms the connection in the group. Refresh the groups list on the leaderboard page to check it.</li>
        <li>Keep the bot&apos;s group privacy mode enabled in BotFather. Members can run commands in the connected group; the bot moves share-text entry to a private chat.</li>
      </ol><div className="discord-guide-actions"><Link className="button telegram-label" href="/leaderboards"><TelegramSymbol />Open leaderboards</Link></div></article>
    </div>
    <section className="discord-guide-section"><h2>Signup from a group</h2><p>Run <code>/signup</code> in a connected group. Open the private bot link it returns, then create an account or sign in on the website. Confirm your identity using the button sent to your private bot chat. The continuation works once and expires after 24 hours. You join the original leaderboard only if the group still points to it and its owner has access.</p></section>
    <section className="discord-guide-section"><h2>Commands</h2><p><code>/daily</code> and <code>/loldle</code> collect share text privately and post a score confirmation to the selected chat. <code>/leaderboard</code> offers game and range buttons and posts up to ten rankings. Use <code>/my_id</code> to get your account UUID. Owners can use <code>/add_member</code>, <code>/setup</code>, <code>/set_leaderboard</code>, and <code>/unset_leaderboard</code>. Telegram&apos;s command menu uses underscores; the bot also accepts typed hyphen variants.</p></section>
  </section></main>;
}
