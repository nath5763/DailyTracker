import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer shell">
    <span>Daily Tracker © 2026</span>
    <span>Scores are self-reported. Keep it honest.</span>
    <nav aria-label="Legal"><Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link></nav>
  </footer>;
}
