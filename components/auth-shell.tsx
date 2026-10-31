import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-page">
    <section className="auth-art"><Logo /><h1>Your crew.<br />Your scores.<br /><em>Every day.</em></h1><p>Private leaderboards for the little games that become big rivalries.</p></section>
    <section className="auth-form-wrap"><div className="auth-card"><h2>{title}</h2><p>{description}</p>
      {children}
      <hr className="divider" />
      <p className="privacy-note">By continuing, you agree to keep the leaderboard friendly and your scores honest. See our <Link href="/privacy">Privacy Policy</Link>.</p>
    </div></section>
  </main>;
}
