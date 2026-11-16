import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Daily Tracker collects, uses, and shares information.",
};
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="privacy-page shell">
        <article className="privacy-content">
          <p className="section-number">PRIVACY POLICY</p>
          <h1>Your data at Daily Tracker</h1>
          <p>Last updated November 16, 2026. This policy explains what Daily Tracker collects, why it is used, and when it is shared. It applies when you visit the site or Mini Program, sign in, submit scores, join a leaderboard, link a chat identity, or manage a subscription.</p>

          <section>
            <h2>Information we collect</h2>
            <ul>
              <li><strong>Account and authentication data:</strong> your email address, a one-way password hash, email-verification and password-reset records, sign-in and session records, hashed action and session tokens, and an authentication cookie used to keep you signed in.</li>
              <li><strong>Profile data:</strong> your display name, avatar color, and shareable account UUID.</li>
              <li><strong>Game and leaderboard data:</strong> the scores and result text you submit, puzzle and play dates, leaderboard names, memberships, rankings, and ownership.</li>
              <li><strong>Discord integration data:</strong> a linked Discord user ID, server and channel IDs connected to leaderboards, link and configuration timestamps, and short-lived one-time link-code and interaction records. Link codes are stored only as hashes.</li>
              <li><strong>Telegram integration data:</strong> a linked Telegram user ID, connected group IDs and names, short-lived signup and link intents, guided-flow state including share text while a submission is pending, and update receipts. Signup and link tokens are stored as hashes.</li>
              <li><strong>WeChat Mini Program data:</strong> a protected app-scoped account identifier, an encrypted temporary WeChat session key, protected identifiers for groups you explicitly connect, short-lived share and account-link references, and mapping audit records. If you use Chat Tool Mode, we temporarily store your encrypted chat-scoped participant identifier to update a card you joined. Member selections for reminders stay on your device. We do not collect WeChat group message history or member lists.</li>
              <li><strong>Billing data:</strong> subscription status and Stripe customer or subscription identifiers. Payment card details are collected and handled by Stripe, not stored by Daily Tracker.</li>
              <li><strong>Technical and advertising data:</strong> IP address, browser or device details, cookie identifiers, and information about visits and ad interactions collected through hosting logs and Google advertising services.</li>
            </ul>
          </section>

          <section>
            <h2>How we use information</h2>
            <p>We use this information to verify email addresses, authenticate accounts, send password-reset messages, maintain sessions, create and display profiles, link chat identities, route submissions to the correct leaderboard, accept and rank scores, operate private leaderboards, process subscriptions, prevent abuse, troubleshoot and secure the service, and show and measure advertising.</p>
          </section>

          <section>
            <h2>When information is shared</h2>
            <p>Daily Tracker shares information only as needed to run the service, comply with law, or protect the service and its users:</p>
            <ul>
              <li><strong>Other leaderboard members</strong> can see the profile, scores, rankings, and account UUIDs made available within leaderboards they share with you. Leaderboard owners can manage membership.</li>
              <li><strong>Brevo</strong> processes your email address and message-delivery data to send verification and password-reset emails.</li>
              <li><strong>Stripe</strong> processes payment and billing data for subscriptions and the customer billing portal.</li>
              <li><strong>Discord</strong> processes slash-command content and identifiers when you use the Discord integration. Daily Tracker returns private command responses through Discord.</li>
              <li><strong>Telegram</strong> processes bot commands, button choices, private share text, and identifiers when you use the Telegram integration. Successful score confirmations and rankings may be posted to the selected group.</li>
              <li><strong>WeChat</strong> processes Mini Program sign-in and cards you choose to share. Daily Tracker sends a login code to WeChat for session exchange. The Mini Program does not read regular group chat messages.</li>
              <li><strong>DigitalOcean</strong> hosts the application and database and may process stored data and technical request logs on our behalf.</li>
              <li><strong>Google</strong> uses cookies and similar technologies to deliver, personalize, and measure advertising through Google AdSense. Depending on your settings and consent choices, Google may use activity from this site and other sites for personalized ads.</li>
            </ul>
            <p>We do not sell your account, profile, score, or leaderboard data.</p>
          </section>

          <section>
            <h2>Cookies and advertising choices</h2>
            <p>The authentication cookie is required for signed-in features. Google and its partners may set advertising cookies or use similar technologies. Where required, a consent message lets you manage advertising choices before optional advertising storage or personalization is used.</p>
            <p>You can review or turn off personalized Google ads in <a href="https://myadcenter.google.com/" rel="noreferrer" target="_blank">My Ad Center</a>, manage broader Google data and privacy settings in your <a href="https://myaccount.google.com/data-and-privacy" rel="noreferrer" target="_blank">Google Account</a>, and learn <a href="https://policies.google.com/technologies/partner-sites" rel="noreferrer" target="_blank">how Google uses information from sites that use its services</a>. Browser controls can also delete or block cookies, although blocking the authentication cookie will prevent sign-in from working.</p>
          </section>

          <section>
            <h2>Retention and security</h2>
            <p>We keep account, profile, score, leaderboard, chat account-link and group-mapping, and subscription records for as long as needed to provide the service and meet security, fraud-prevention, legal, and accounting obligations. WeChat session keys are encrypted and expire after about two hours; group claims expire after five minutes; share cards expire after one day. Expired bot link-code and signup-intent records are removed after about one day, pending Telegram flows after expiry, and bot update receipts after about seven days. Passwords are stored only as adaptive one-way hashes, authentication and link codes are stored as hashes, and production traffic uses HTTPS. No online service can guarantee absolute security.</p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>You can choose not to create an account, unlink Discord, Telegram, or WeChat from your Profile or their respective app controls, disconnect WeChat group mappings on leaderboards you own, control Google advertising preferences through the links above, and use Stripe&apos;s billing portal to manage a subscription. Privacy choices offered through the site&apos;s consent message apply where required by regional law.</p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>We may update this policy as the service or its providers change. The updated date at the top will show when the latest version took effect.</p>
          </section>
        </article>
      </div>
    </main>
  );
}
