import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

const sampleRows = [
  { rank: "01", name: "Maya", score: "1.18×", meta: "7 day avg", color: "#ddff4f" },
  { rank: "02", name: "Theo", score: "1.42×", meta: "7 day avg", color: "#ffb4d2" },
  { rank: "03", name: "You", score: "1.67×", meta: "7 day avg", color: "#a8c7ff" },
];

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="hero shell">
        <div className="eyebrow"><span /> Built for the group chat</div>
        <h1>Daily games.<br /><em>Friendly stakes.</em></h1>
        <p className="hero-copy">One private scoreboard for every tiny game your friends refuse to stop talking about.</p>
        <div className="hero-actions">
          <Link className="button" href="/auth">Start your club <span>→</span></Link>
          <a className="secondary-link" href="#how">See how it works</a>
          <Link className="secondary-link" href="/games">Browse games</Link>
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

      <section className="marquee" aria-hidden="true">
        <span>PASTE SCORE ✦ COMPARE ✦ TALK TRASH ✦ REPEAT ✦ PASTE SCORE ✦ COMPARE ✦ TALK TRASH ✦ REPEAT ✦</span>
      </section>

      <section className="how shell" id="how">
        <div>
          <p className="section-number">01 — HOW IT WORKS</p>
          <h2>From result screen<br />to bragging rights.</h2>
        </div>
        <div className="steps">
          <article><span>1</span><h3>Play elsewhere</h3><p>Finish a supported daily puzzle and copy the share text.</p></article>
          <article><span>2</span><h3>Paste it here</h3><p>We read the puzzle and score, then ask you to confirm.</p></article>
          <article><span>3</span><h3>See the table</h3><p>Your private groups update across today, this week, and all time.</p></article>
        </div>
      </section>

      <section className="discord-feature shell" aria-labelledby="discord-title">
        <div><p className="section-number">PLAY TOGETHER, WHERE YOU CHAT</p><h2 id="discord-title">Your daily games club belongs in Discord, too.</h2></div>
        <div><p>Link your Daily Club account, submit Fermi and Krillion results with <code>/daily</code>, and see your group&apos;s rankings with <code>/leaderboard</code> in a connected channel.</p><p>Paid board owners can connect server channels. Friends on the free plan can join in.</p><Link className="button" href="/pricing">See plans <span aria-hidden="true">→</span></Link></div>
      </section>

      <section className="closing shell">
        <div className="closing-mark">↗</div>
        <h2>Tomorrow’s score<br />starts today.</h2>
        <Link className="button button-dark" href="/auth">Create your account <span>→</span></Link>
      </section>
    </main>
  );
}
