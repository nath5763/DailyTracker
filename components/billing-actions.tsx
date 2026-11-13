"use client";

import { useState } from "react";
import type { BillingTier } from "@/lib/types";

type BillingEndpoint = "/api/v1/billing/checkout-session" | "/api/v1/billing/portal-session" | "/api/v1/billing/plan-change-session";
type BillingResponse = { url?: string; error?: string; code?: string };

async function createBillingSession(endpoint: BillingEndpoint, tier?: BillingTier) {
  const response = await fetch(endpoint, { method: "POST", headers: tier ? { "Content-Type": "application/json" } : undefined,
    body: tier ? JSON.stringify({ tier }) : undefined });
  const data = await response.json().catch(() => ({})) as BillingResponse;
  return { response, data };
}

function BillingButton({ endpoint, tier, children, className = "button" }: { endpoint: BillingEndpoint; tier?: BillingTier; children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function openBilling() {
    setLoading(true);
    setMessage("");
    try {
      let { response, data } = await createBillingSession(endpoint, tier);
      if (endpoint === "/api/v1/billing/checkout-session" && response.status === 409 &&
          data.code === "BILLING_SUBSCRIPTION_REQUIRES_MANAGEMENT") {
        ({ response, data } = await createBillingSession("/api/v1/billing/portal-session"));
      }
      if (!response.ok || !data.url) {
        setMessage(data.error ?? "Billing could not be opened. Try again shortly.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setMessage("Billing could not be opened. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="billing-action"><button className={className} disabled={loading} onClick={openBilling} type="button">{loading ? "Opening..." : children}</button>{message ? <div className="form-message error">{message}</div> : null}</div>;
}

export function SubscribeButton({ tier = "STANDARD" }: { tier?: "STANDARD" | "PREMIUM" }) {
  return <BillingButton endpoint="/api/v1/billing/checkout-session" tier={tier}>Subscribe for {tier === "PREMIUM" ? "$5" : "$2"}/month <span aria-hidden="true">-&gt;</span></BillingButton>;
}

export function SubscriptionChoices() {
  return <div className="billing-buttons"><SubscribeButton tier="STANDARD" /><SubscribeButton tier="PREMIUM" /></div>;
}

export function ManageBillingButton() {
  return <BillingButton className="button button-ghost" endpoint="/api/v1/billing/portal-session">Manage billing</BillingButton>;
}

export function ChangePlanButton() {
  return <BillingButton endpoint="/api/v1/billing/plan-change-session">Change plan</BillingButton>;
}
