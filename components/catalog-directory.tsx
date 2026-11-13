"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { CatalogGame } from "@/lib/types";

export function filterCatalog(games: CatalogGame[], query: string, category: string, trackedOnly = false) {
  const normalized = query.trim().toLocaleLowerCase();
  return games.filter((game) => (!trackedOnly || game.scoreTrackingAvailable) &&
    (category === "All" || game.category === category) &&
    (!normalized || `${game.name} ${game.description}`.toLocaleLowerCase().includes(normalized)));
}

export function CatalogDirectory({ games, initialTrackedOnly = false }: { games: CatalogGame[]; initialTrackedOnly?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [trackedOnly, setTrackedOnly] = useState(initialTrackedOnly);
  const categories = useMemo(() => ["All", ...new Set(games.map((game) => game.category))], [games]);
  const matches = filterCatalog(games, query, category, trackedOnly);
  const grouped = categories.filter((value) => value !== "All").map((value) => ({
    category: value, games: matches.filter((game) => game.category === value),
  })).filter((group) => group.games.length);

  return <section className="page shell catalog-page">
    <div className="daily-catalog-feature"><div><p className="section-number">PLAY HERE, EVERY DAY</p><h2>Letter Bag</h2><p>Build words from a fresh bag of letters in 90 seconds.</p><Link className="button button-small" href="/daily/letter-bag">Play today →</Link><Link href="/daily">All daily games</Link></div><Image src="/letter-bag/letter-bag-3x2.png" width={600} height={400} alt="Illustrated letter bag" /></div>
    <div className="page-heading"><div><p className="section-number">PLAY DAILY, COMPARE WITH FRIENDS</p><h1>Daily games</h1></div>
      <p>Play Letter Bag here, or find a puzzle on its original site and share your result when score tracking is available.</p></div>
    <div className="catalog-filters">
      <div className="field"><label htmlFor="catalog-search">Search games</label><input id="catalog-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or description" /></div>
      <div className="field"><label htmlFor="catalog-category">Category</label><select id="catalog-category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      <button className={`catalog-tracking-filter ${trackedOnly ? "active" : ""}`} type="button" aria-pressed={trackedOnly} onClick={() => setTrackedOnly((current) => !current)}>Score tracking only</button>
    </div>
    <p className="subtle" aria-live="polite">{matches.length} game{matches.length === 1 ? "" : "s"} found</p>
    {grouped.length ? grouped.map((group) => <section className="catalog-group" key={group.category}>
      <h2>{group.category}</h2><div className="catalog-grid">{group.games.map((game) => <article className="card catalog-card" key={game.slug}>
        <div><h3>{game.name}</h3>{game.scoreTrackingAvailable ? <span className="result-chip">Score tracking available</span> : null}</div>
        <p>{game.description}</p>{game.slug === "letter-bag" ? <Link className="button button-small" href="/daily/letter-bag">Play here →</Link> : <a className="button button-small" href={game.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Play ${game.name} on its original site`}>Play on original site ↗</a>}
      </article>)}</div>
    </section>) : <div className="empty">No games match your search.</div>}
  </section>;
}
