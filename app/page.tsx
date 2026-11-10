import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DiscordSymbol } from "@/components/discord-symbol";
import { apiFetch } from "@/lib/api";
import type { CatalogGame } from "@/lib/types";

export const dynamic = "force-dynamic";

const sampleRows = [
  { rank: "01", name: "Maya", score: "1.18×", meta: "7 day avg", color: "var(--avatar-lime)" },
  { rank: "02", name: "Theo", score: "1.42×", meta: "7 day avg", color: "#ffb4d2" },
  { rank: "03", name: "You", score: "1.67×", meta: "7 day avg", color: "#a8c7ff" },
];

export default async function HomePage() {
  const supportedGames = (await apiFetch<CatalogGame[]>("/catalog/games"))
    .filter((game) => game.scoreTrackingAvailable);
  const featuredGames = supportedGames.slice(0, 5);
  return (
    <main>
      <SiteHeader />
      <section className="hero shell">
        <div className="eyebrow"><span /> Built for the group chat</div>
        <h1>Daily games<br /><em>Friendly stakes</em></h1>
        <p className="hero-copy">One private scoreboard for every tiny game your friends refuse to stop talking about.</p>
        <div className="hero-actions">
          <Link className="button" href="/auth">Start your club <span>→</span></Link>
          <a className="secondary-link" href="#how">See how it works</a>
          <Link className="secondary-link" href="/games">Browse games</Link>
          <a className="secondary-link hero-discord-link" href="#discord"><DiscordSymbol />Integrate with Discord</a>
        </div>

        <div className="hero-board" aria-label="Example leaderboard">
          <div className="board-topline">
            <div><span className="live-dot" /> Daily challenge · Week 42</div>
            <span>Lower is better</span>
          </div>
          {sampleRows.map((row) => (
            <div className="sample-row" key={row.rank}>
              <span className="sample-rank">{row.rank}</span>
              <span className="avatar" style={{ background: row.color }}>{row.name[0]}</span>
              <span className="sample-name">{row.name}<small>{row.meta}</small></span>
              <strong>{row.score}</strong>
            </div>
          ))}
          <div className="board-caption">No global rankings. Just your people.</div>
        </div>
      </section>

      <section className="home-games shell" aria-labelledby="home-games-title">
        <div className="home-games-heading">
          <div><p className="section-number">GAMES WE TRACK</p><h2 id="home-games-title">Your favorites, on one scoreboard</h2></div>
          <Link className="secondary-link" href="/games?tracking=available">View all supported games →</Link>
        </div>
        <p>Track results for {supportedGames.length} daily game{supportedGames.length === 1 ? "" : "s"}, including:</p>
        <ul className="home-games-list">{featuredGames.map((game) => <li key={game.slug}>{game.name}</li>)}</ul>
      </section>

      <section className="marquee" aria-hidden="true">
        <span>PASTE SCORE ✦ COMPARE ✦ TALK TRASH ✦ REPEAT ✦ PASTE SCORE ✦ COMPARE ✦ TALK TRASH ✦ REPEAT ✦</span>
      </section>

      <section className="how shell" id="how">
        <div>
          <p className="section-number">01 — HOW IT WORKS</p>
          <h2>From result screen<br />to bragging rights</h2>
        </div>
        <div className="steps">
          <article><span>1</span><h3>Play elsewhere</h3><p>Finish a supported daily puzzle and copy the share text.</p></article>
          <article><span>2</span><h3>Paste it here</h3><p>We read the puzzle and score, then ask you to confirm.</p></article>
          <article><span>3</span><h3>See the table</h3><p>Your private groups update across today, this week, and all time.</p></article>
        </div>
      </section>

      <section className="discord-feature shell" id="discord" aria-labelledby="discord-title">
        <div><p className="section-number">PLAY TOGETHER, WHERE YOU CHAT</p><h2 className="discord-label" id="discord-title"><DiscordSymbol />Your daily games club belongs in Discord, too</h2></div>
        <div><p>Link your Daily Tracker account, submit supported game share results with <code>/daily</code>, and see your multi-game leaderboard rankings with <code>/leaderboard</code>. Choose a game for each command.</p><p>Paid board owners can connect server channels. Friends on the free plan can join in, and the user app works in DMs and Group DMs.</p><Link className="button discord-label" href="/discord"><DiscordSymbol />Set up Discord <span aria-hidden="true">→</span></Link></div>
      </section>

      <section className="closing shell">
        <div className="closing-mark">↗</div>
        <h2>Tomorrow’s score<br />starts today</h2>
        <Link className="button button-dark" href="/auth">Create your account <span>→</span></Link>
      </section>
    </main>
  );
}
