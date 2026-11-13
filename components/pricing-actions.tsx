"use client";

import { AppLink } from "@/components/app-link";
import { ChangePlanButton, ManageBillingButton, SubscribeButton } from "@/components/billing-actions";
import type { BillingStatus } from "@/lib/types";
import { canStartCheckout } from "@/components/subscription-panel";

export function PricingActions({ tier, billing, shareId, needsSetup = false }: { tier: "FREE" | "STANDARD" | "PREMIUM"; billing: BillingStatus | null; shareId?: string; needsSetup?: boolean }) {
  if (!billing) return <AppLink className="button" href={needsSetup ? "/onboarding?next=%2Fpricing" : "/auth?next=%2Fpricing"}>{needsSetup ? "Finish setup to choose" : "Sign in to choose"}</AppLink>;
  if (tier === "FREE") return billing.tier === "FREE" ? <span className="pricing-current">Your current plan</span> : <AppLink className="button button-ghost" href={`/profile/${shareId}`}>View your plan</AppLink>;
  if (billing.tier === tier) return <div className="pricing-action-stack"><span className="pricing-current">Your current plan</span><ManageBillingButton /></div>;
  if (!canStartCheckout(billing)) return billing.tier === "FREE" ? <ManageBillingButton /> : <ChangePlanButton />;
  return <SubscribeButton tier={tier} />;
}
