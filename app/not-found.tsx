import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return <main><SiteHeader /><section className="page shell"><p className="section-number">404</p><div className="page-heading"><div><h1>Not on this board.</h1><p>The page may be private, removed, or simply not yours to see.</p></div></div><Link className="button" href="/dashboard">Back to overview <span>→</span></Link></section></main>;
}
