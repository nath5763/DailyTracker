import { SiteHeader } from "@/components/site-header";
import { PricingActions } from "@/components/pricing-actions";
import { getViewer } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { BillingStatus } from "@/lib/types";

export const metadata = { title: "Pricing · Daily Club", description: "Compare Daily Club's free and paid plans for private daily game leaderboards and Discord integration." };
export const dynamic = "force-dynamic";

const plans = [
  { tier: "FREE", name: "Free", price: "$0", description: "Start a private daily games club.", features: ["Five single-game leaderboards", "Daily, weekly, monthly, and all-time rankings", "Join a paid owner's connected Discord channel"] },
  { tier: "STANDARD", name: "Standard", price: "$2", description: "Bring the whole club together.", features: ["Everything in Free", "One all-game leaderboard", "Connect your Discord server channel"] },
  { tier: "PREMIUM", name: "Premium", price: "$5", description: "Room for more groups.", features: ["Everything in Standard", "Five all-game leaderboards total", "Connect your Discord server channels"] },
] as const;

export default async function PricingPage() {
  const viewer = await getViewer();
  const billing = viewer.profile ? await apiFetch<BillingStatus>("/billing/status") : null;
  return <main className="app-shell"><SiteHeader viewer={viewer} /><section className="page shell">
    <div className="page-heading"><div><p className="section-number">SIMPLE MONTHLY PLANS</p><h1>Pick your club&apos;s plan.</h1></div><p>Every plan lets you share scores with friends. Paid plans give board owners more ways to bring their games together.</p></div>
    <div className="pricing-grid">{plans.map((plan) => <article className={`card pricing-card ${plan.tier === "STANDARD" ? "card-lime" : ""}`} key={plan.tier}>
      <p className="section-number">{plan.name.toUpperCase()}</p><h2>{plan.price}<small>{plan.tier === "FREE" ? " forever" : " / month"}</small></h2><p>{plan.description}</p>
      <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <PricingActions tier={plan.tier} billing={billing} shareId={viewer.profile?.shareId} needsSetup={Boolean(viewer.user && !viewer.profile)} />
    </article>)}</div>
    <p className="pricing-note">Discord commands currently support Fermi and Krillion. Linked free members can use supported commands in a paid owner&apos;s connected channel. You can change or cancel a paid plan in Stripe billing settings.</p>
  </section></main>;
}
