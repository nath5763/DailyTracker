import type { Word } from "@/lib/letter-bag/engine";
import { letterBonus, wordScore } from "@/lib/letter-bag/scoring";

export function LetterBagTileFace({ letter }: { letter: string }) {
  const bonus = letterBonus(letter);
  return <>{letter}{bonus > 0 ? <small className="lb-tile-bonus" aria-label={`${bonus} bonus points`}>{bonus}</small> : null}</>;
}

export function potentialWordPoints(letters: string) {
  return wordScore(letters);
}

export function LetterBagPlayHistory({ words }: { words: Word[] }) {
  return <aside className="lb-live-history" aria-label="Played words">
    <h2>Played words <span>{words.length}</span></h2>
    {words.length ? <ol>{[...words].reverse().map((word, index) =>
      <li key={`${words.length - index}-${word.word}`}><span>{word.word}</span><strong>+{word.points}</strong></li>
    )}</ol> : <p>Your words will appear here.</p>}
  </aside>;
}
