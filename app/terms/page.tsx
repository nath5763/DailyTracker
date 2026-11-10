import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Daily Tracker leaderboards, scores, Discord integration, and subscriptions.",
};
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return <main className="app-shell">
    <SiteHeader />
    <div className="privacy-page shell">
      <article className="privacy-content">
        <p className="section-number">TERMS OF SERVICE</p>
        <h1>Play fair. Keep it friendly.</h1>
        <p>Last updated November 4, 2026. These terms govern your use of Daily Tracker, operated by SNSH Solutions. By creating an account or using the service, you agree to these terms.</p>

        <section>
          <h2>Your account</h2>
          <p>Provide an email address you control, keep your sign-in details secure, and take responsibility for activity under your account. You may use the service only in a way that follows applicable law and these terms.</p>
        </section>

        <section>
          <h2>Scores and leaderboards</h2>
          <p>Scores are self-reported. Submit only your own genuine game results and check the preview carefully: an individual saved result cannot currently be edited or removed. Rankings reflect submitted results and are not independently verified by Daily Tracker.</p>
          <p>Leaderboards are shared with their members. Owners choose whom to invite and manage membership. Treat other players respectfully; do not use names, result text, or leaderboard features to harass others, impersonate someone, or disrupt the service.</p>
        </section>

        <section>
          <h2>Subscriptions and billing</h2>
          <p>Daily Tracker offers a free tier and monthly paid tiers. The current price and included features are shown before checkout. Stripe handles payment details and provides the billing portal, where you can change tiers or cancel your subscription.</p>
          <p>Cancelling a subscription normally leaves paid access available through the current billing period. If paid access ends, existing all-game leaderboards become locked and connected Discord channels stop working until the board owner regains a paid entitlement. Existing boards are kept when a tier limit decreases, but creation remains subject to the current limit.</p>
        </section>

        <section>
          <h2>Discord and other services</h2>
          <p>Discord account linking is optional. A leaderboard owner needs a paid tier to connect a server channel; linked free members can use supported commands in a paid owner&apos;s connected channel. Your use of Discord, supported games, and Stripe is also subject to those providers&apos; own terms.</p>
        </section>

        <section>
          <h2>Availability and changes</h2>
          <p>We may update games, features, prices for future billing, or these terms as the service changes. We may restrict access when needed to protect the service or other users. We do not promise uninterrupted availability or independently verified scores. The updated date at the top will identify the current version of these terms.</p>
        </section>

        <section>
          <h2>Privacy and contact</h2>
          <p>Our <Link href="/privacy">Privacy Policy</Link> explains how we handle information. For questions about these terms, contact SNSH Solutions at <a href="mailto:noreply.dailyg@gmail.com">noreply.dailyg@gmail.com</a>.</p>
        </section>
      </article>
    </div>
  </main>;
}
