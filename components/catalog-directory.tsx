"use client";

import { useMemo, useState } from "react";
import type { CatalogGame } from "@/lib/types";

export function filterCatalog(games: CatalogGame[], query: string, category: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return games.filter((game) => (category === "All" || game.category === category) &&
    (!normalized || `${game.name} ${game.description}`.toLocaleLowerCase().includes(normalized)));
}

export function CatalogDirectory({ games }: { games: CatalogGame[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = useMemo(() => ["All", ...new Set(games.map((game) => game.category))], [games]);
  const matches = filterCatalog(games, query, category);
  const grouped = categories.filter((value) => value !== "All").map((value) => ({
    category: value, games: matches.filter((game) => game.category === value),
  })).filter((group) => group.games.length);

  return <section className="page shell catalog-page">
    <div className="page-heading"><div><p className="section-number">PLAY ELSEWHERE, COMPARE HERE</p><h1>Daily games</h1></div>
      <p>Find a puzzle, play it on its original site, and come back to share your result when score tracking is available.</p></div>
    <div className="catalog-filters">
      <div className="field"><label htmlFor="catalog-search">Search games</label><input id="catalog-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or description" /></div>
      <div className="field"><label htmlFor="catalog-category">Category</label><select id="catalog-category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
    </div>
    <p className="subtle" aria-live="polite">{matches.length} game{matches.length === 1 ? "" : "s"} found</p>
    {grouped.length ? grouped.map((group) => <section className="catalog-group" key={group.category}>
      <h2>{group.category}</h2><div className="catalog-grid">{group.games.map((game) => <article className="card catalog-card" key={game.slug}>
        <div><h3>{game.name}</h3>{game.scoreTrackingAvailable ? <span className="result-chip">Score tracking available</span> : null}</div>
        <p>{game.description}</p><a className="button button-small" href={game.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Play ${game.name} on its original site`}>Play on original site ↗</a>
      </article>)}</div>
    </section>) : <div className="empty">No games match your search.</div>}
  </section>;
}
