"use client";

import { useState } from "react";

type BillingEndpoint = "/api/v1/billing/checkout-session" | "/api/v1/billing/portal-session";

function BillingButton({ endpoint, children, className = "button" }: { endpoint: BillingEndpoint; children: React.ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function openBilling() {
    setLoading(true);
    setMessage("");
    const response = await fetch(endpoint, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      setMessage(data.error ?? "Billing could not be opened. Try again shortly.");
      setLoading(false);
      return;
    }
    window.location.assign(data.url);
  }

  return <div className="billing-action"><button className={className} disabled={loading} onClick={openBilling} type="button">{loading ? "Opening..." : children}</button>{message ? <div className="form-message error">{message}</div> : null}</div>;
}

export function SubscribeButton() {
  return <BillingButton endpoint="/api/v1/billing/checkout-session">Subscribe for $2/month <span aria-hidden="true">-&gt;</span></BillingButton>;
}

export function ManageBillingButton() {
  return <BillingButton className="button button-ghost" endpoint="/api/v1/billing/portal-session">Manage billing</BillingButton>;
}
