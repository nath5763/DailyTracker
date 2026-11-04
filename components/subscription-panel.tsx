"use client";

import { useEffect } from "react";
import { AppLink } from "@/components/app-link";
import { ManageBillingButton, SubscriptionChoices } from "@/components/billing-actions";
import { useAppData } from "@/components/app-data-provider";
import { invalidateClientCache, useCachedApi } from "@/lib/client-cache";
import type { BillingStatus } from "@/lib/types";

export function canStartCheckout(billing: BillingStatus) {
  return billing.tier === "FREE" && (!billing.status || billing.status === "canceled" || billing.status === "incomplete_expired");
}

export function SubscriptionPanel({ checkout, billingReturn }: { checkout?: string; billingReturn?: string }) {
  const { userId } = useAppData();
  const { data: billing, error, refresh } = useCachedApi<BillingStatus>("/billing/status");

  useEffect(() => {
    if (billingReturn !== "returned") return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [billingReturn, refresh]);

  useEffect(() => {
    if (checkout !== "success" || billing?.tier !== "FREE") return;
    let attempts = 0;
    let stopped = false;
    let timer: number;
    const poll = async () => {
      attempts += 1;
      try {
        const updated = await refresh();
        if (!stopped && updated.tier !== "FREE") {
          invalidateClientCache(userId, ["/dashboard", "/leaderboards"]);
          return;
        }
      } catch { /* Manual refresh remains available. */ }
      if (!stopped && attempts < 30) timer = window.setTimeout(() => void poll(), 2000);
    };
    timer = window.setTimeout(() => void poll(), 2000);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [checkout, billing?.tier, refresh, userId]);

  return <section className="card subscription-panel" aria-label="Subscription">
    <p className="section-number">SUBSCRIPTION</p>
    <h2>Your plan</h2>
    {error ? <p className="form-message error">{error}</p> : null}
    {!billing ? <p>Loading subscription…</p> : <>
      {checkout === "success" ? <p className="form-message">{billing.tier === "FREE" ? "Payment received. Waiting for Stripe to confirm your subscription…" : "Subscription active. Your paid features are ready."}</p> : null}
      {checkout === "cancelled" ? <p className="form-message">Checkout was cancelled. Your plan has not changed.</p> : null}
      <p className="subscription-tier">{billing.tier === "PREMIUM" ? "$5/month" : billing.tier === "STANDARD" ? "$2/month" : "Free"}</p>
      <p>Single-game boards: {billing.singleGameCount} / {billing.singleGameLimit}<br />All-game boards: {billing.allGameCount} / {billing.allGameLimit}</p>
      <p className="subtle">{billing.tier === "FREE" ? "Paid plans add all-game boards and Discord server integration." : "Your plan includes Discord server integration."}</p>
      {billing.status && billing.status !== "active" ? <p className="subtle">Subscription status: {billing.status.replaceAll("_", " ")}</p> : null}
      {billing.cancelAtPeriodEnd && billing.currentPeriodEnd ? <p className="form-message">Paid access continues through {new Date(billing.currentPeriodEnd).toLocaleDateString()}.</p> : null}
      {billing.graceUntil ? <p className="form-message error">Payment needs attention before {new Date(billing.graceUntil).toLocaleDateString()}.</p> : null}
      {!billing.cancelAtPeriodEnd && billing.currentPeriodEnd ? <p className="subtle">Current billing period ends {new Date(billing.currentPeriodEnd).toLocaleDateString()}.</p> : null}
      <div className="subscription-actions">{canStartCheckout(billing) ? <SubscriptionChoices /> : <ManageBillingButton />}<AppLink className="secondary-link" href="/pricing">Compare plans</AppLink><button className="text-button" type="button" onClick={() => void refresh()}>Refresh subscription</button></div>
    </>}
  </section>;
}
