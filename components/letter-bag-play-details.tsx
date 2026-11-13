import type { Word } from "@/lib/letter-bag/engine";

export function potentialWordPoints(tileCount: number) {
  return tileCount ? 1 + tileCount * (tileCount + 1) / 2 : 0;
}

export function LetterBagPlayHistory({ words }: { words: Word[] }) {
  return <aside className="lb-live-history" aria-label="Played words">
    <h2>Played words <span>{words.length}</span></h2>
    {words.length ? <ol>{[...words].reverse().map((word, index) =>
      <li key={`${words.length - index}-${word.word}`}><span>{word.word}</span><strong>+{word.points}</strong></li>
    )}</ol> : <p>Your words will appear here.</p>}
  </aside>;
}
