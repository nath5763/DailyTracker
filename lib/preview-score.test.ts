import { expect, test } from "vitest";
import { previewScore } from "./preview-score";

test("previews a Fermi result with date, percentile, and component scores", () => {
  expect(previewScore("fermi", "Fermi #92\n1.31× score\ntop 8%")).toEqual({
    puzzleKey: "92", puzzleNumber: 92, playedOn: "2026-10-26", primaryScore: 1.31,
    metrics: { displayScore: "1.31×", percentile: 8 }, parserVersion: 1,
  });
  expect(previewScore("fermi", "Fermi #7\n1,50x score\nQ1 1.20x\nQ2 1.40x\nQ3 2.10x").metrics)
    .toEqual({ displayScore: "1.5×", components: [1.2, 1.4, 2.1] });
  expect(previewScore("fermi", "Fermi #8\n1.235x score").metrics.displayScore).toBe("1.24×");
});

test("treats grouped Fermi multipliers as thousands", () => {
  const preview = previewScore("fermi", "Fermi #103\n1,960x score\nQ1 1,200x\nQ2 2.50x\nQ3 4,000x");
  expect(preview.primaryScore).toBe(1960);
  expect(preview.metrics.displayScore).toBe("1960×");
  expect(preview.metrics.components).toEqual([1200, 2.5, 4000]);
});

test("rejects invalid Fermi text before saving", () => {
  expect(() => previewScore("fermi", "Wordle #92\n0.5× score")).toThrow("Fermi");
});

test("previews a Krillion daily result and checks its seven symbols", () => {
  const result = previewScore("krillion", "Krillion #82 🦐\n180\n\n🐟🫧🫧🐟🦑🫧🐟\n\nhttps://krillion.io");
  expect(result).toEqual({ puzzleKey: "82", puzzleNumber: 82, playedOn: "2026-10-05", primaryScore: 180,
    metrics: { tiers: ["schooler", "plankton", "plankton", "schooler", "rare", "plankton", "schooler"] }, parserVersion: 1 });
  expect(previewScore("krillion", "Krillion #1 🦐\n0\n\n⬛⬛⬛⬛⬛⬛⬛").primaryScore).toBe(0);
  expect(previewScore("krillion", "Krillion #2 🦐\n700\n\n🌟🌟🌟🌟🌟🌟🌟").primaryScore).toBe(700);
});

test("rejects other Krillion modes and mismatched scores", () => {
  expect(() => previewScore("krillion", "Krillion ⟲ #82 🦐\n180\n\n🐟🫧🫧🐟🦑🫧🐟")).toThrow("numbered");
  expect(() => previewScore("krillion", "Krillion #82 🦐\n181\n\n🐟🫧🫧🐟🦑🫧🐟")).toThrow("does not match");
  expect(() => previewScore("krillion", "Krillion #82 🦐\n150\n\n🐟🫧🫧🐟🦑🫧")).toThrow("seven");
});

test("previews Travle Daily and Weekly Challenge results with mode-specific dates and keys", () => {
  expect(previewScore("travle", "#travle #1439 +2 (1 hint)\n✅🟧🟩✅\nhttps://travle.earth")).toEqual({
    puzzleKey: "Daily:1439", puzzleNumber: 1439, playedOn: "2026-11-22", primaryScore: 2,
    metrics: { completionStatus: "WIN", extraGuesses: 2, hints: 1, assistanceStatus: "assisted",
      resultSequence: "✅🟧🟩✅", gameMode: "Daily", displayScore: "+2" }, parserVersion: 1,
  });
  expect(previewScore("travle", "#travle_challenge #38 +1✅🟥✅\nhttps://travle.earth/challenge")).toMatchObject({
    puzzleKey: "Weekly:38", puzzleNumber: 38, playedOn: "2024-10-21", primaryScore: 1,
    metrics: { hints: 0, gameMode: "Weekly", resultSequence: "✅🟥✅", displayScore: "+1" },
  });
});

test("previews perfect and plural-hint Travle scores", () => {
  expect(previewScore("travle", "#travle #1439 +0 (Perfect) ✅✅✅\nhttps://travle.earth/")).toMatchObject({
    primaryScore: 0, metrics: { hints: 0, assistanceStatus: "unassisted", displayScore: "+0" },
  });
  expect(previewScore("travle", "#travle_challenge #38 +0 (3 hints)\n🟩🟩✅\nhttps://travle.earth/challenge/").metrics)
    .toMatchObject({ hints: 3, assistanceStatus: "assisted" });
});

test("rejects malformed or mismatched Travle shares", () => {
  const invalid = [
    "#travle_practice #1439 +0\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0\n✅✅\nhttps://travle.earth/challenge",
    "#travle_challenge #38 +0\n✅✅\nhttps://travle.earth",
    "#travle #1439 +7\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0 (4 hints)\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0 (1 hints)\n✅✅\nhttps://travle.earth",
    "#travle #1439 +1 (Perfect)\n✅✅\nhttps://travle.earth",
    "#travle #1439 +0\nhttps://travle.earth",
    "#travle #1439 +0\n✅✅\nWordle 1 1/6\nhttps://travle.earth",
    "#travle #100000 +0\n✅✅\nhttps://travle.earth",
  ];
  for (const share of invalid) expect(() => previewScore("travle", share)).toThrow();
});

test("previews the supplied Farflung result with verified rarities and date", () => {
  const share = "Farflung #50 · 195/500 km\nMiss · Elusive · Rare · Miss · Common\nhttps://farflung.game/s/qtrtpp?e=50";
  expect(previewScore("farflung", share)).toEqual({
    puzzleKey: "50",
    puzzleNumber: 50,
    playedOn: "2026-11-23",
    primaryScore: 195,
    metrics: {
      completionStatus: "WIN",
      distanceKm: 195,
      rarities: ["Miss", "Elusive", "Rare", "Miss", "Common"],
      gameMode: "Daily",
      scoreRaw: "195/500 km",
      scoreUnit: "km",
      displayScore: "195/500 km",
    },
    parserVersion: 1,
  });
});

test("accepts Farflung score boundaries and rejects malformed or starred shares", () => {
  expect(previewScore("farflung", "Farflung #1 · 0/500 km\n" +
    "Miss · Miss · Miss · Miss · Miss\nhttps://farflung.game/s/aaaaaa?e=1").primaryScore).toBe(0);
  expect(previewScore("farflung", "Farflung #1 · 500/500 km\n" +
    "Farflung · Farflung · Farflung · Farflung · Farflung\nhttps://farflung.game/s/zzzzzz?e=1").primaryScore).toBe(500);

  const share = "Farflung #50 · 195/500 km\nMiss · Elusive · Rare · Miss · Common\nhttps://farflung.game/s/qtrtpp?e=50";
  const invalid = [
    share.replace("195/500", "196/500"),
    share.replace("Miss · Common", "Common"),
    share.replace("Common", "Legendary"),
    share.replace("?e=50", "?e=49"),
    share.replace("farflung.game", "example.com"),
    share.replace("qtrtpp", "QTRTPP"),
    share.replace("#50", "#050"),
    share.replace("195/500 km", "195/500 km ★"),
    share + "\nWordle 1 1/6",
    "Farflung #100000 · 0/500 km\nMiss · Miss · Miss · Miss · Miss\nhttps://farflung.game/s/aaaaaa?e=100000",
  ];
  for (const value of invalid) expect(() => previewScore("farflung", value)).toThrow();
});

const perceptleShare = "Perceptle #129 - C (62)\n" +
  "🔢 13  🎯 93  📐 93  🥁 11  ✂️ 98\nhttps://perceptle.io/";

function perceptleGrade(score: number) {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function makePerceptleShare(overall: number, scores: number[], puzzle = 1) {
  return `Perceptle #${puzzle} - ${perceptleGrade(overall)} (${overall})\n` +
    `🔢 ${scores[0]}  🎯 ${scores[1]}  📐 ${scores[2]}  🥁 ${scores[3]}  ✂️ ${scores[4]}\n` +
    "https://perceptle.io/";
}

test("previews the supplied Perceptle result with verified score, grade, events, and date", () => {
  expect(previewScore("perceptle", perceptleShare)).toEqual({
    puzzleKey: "129",
    puzzleNumber: 129,
    playedOn: "2026-11-23",
    primaryScore: 62,
    metrics: {
      completionStatus: "WIN",
      overallScore: 62,
      countScore: 13,
      trackScore: 93,
      angleScore: 93,
      tempoScore: 11,
      splitScore: 98,
      grade: "C",
      gameMode: "Daily",
      scoreRaw: "62",
      scoreUnit: "points",
      displayScore: "C (62)",
    },
    parserVersion: 1,
  });
});

test("accepts Perceptle boundaries, grade thresholds, rounding, and variable spacing", () => {
  expect(previewScore("perceptle", makePerceptleShare(0, [0, 0, 0, 0, 0])).primaryScore).toBe(0);
  expect(previewScore("perceptle", makePerceptleShare(100, [100, 100, 100, 100, 100])).primaryScore).toBe(100);
  for (const score of [40, 55, 70, 85, 95]) {
    expect(previewScore("perceptle", makePerceptleShare(score, Array(5).fill(score))).metrics.grade)
      .toBe(perceptleGrade(score));
  }
  const expected = [50, 50, 50, 51, 51];
  for (let remainder = 0; remainder < 5; remainder++) {
    expect(previewScore("perceptle", makePerceptleShare(expected[remainder], [50 + remainder, 50, 50, 50, 50])).primaryScore)
      .toBe(expected[remainder]);
  }
  expect(previewScore("perceptle", perceptleShare.replaceAll("  ", "\t   ").replace("✂️ 98", "✂98")).primaryScore)
    .toBe(62);
});

test("rejects malformed, mismatched, future, non-daily, and mixed Perceptle shares", () => {
  const invalid = [
    perceptleShare.replace("C (62)", "C (63)"),
    perceptleShare.replace("C (62)", "B (62)"),
    perceptleShare.replace("✂️ 98", ""),
    perceptleShare.replace("✂️ 98", "✂️ 98  🔢 13"),
    perceptleShare.replace("🔢 13", "🔢 101"),
    perceptleShare.replace("#129", "#0"),
    perceptleShare.replace("#129", "#0129"),
    perceptleShare.replace("#129", "#100000"),
    perceptleShare.replace("perceptle.io", "example.com"),
    perceptleShare.replace("https://perceptle.io/", "https://perceptle.io/unlimited/"),
    perceptleShare.replace("#129 -", "#129 🃏 -"),
    perceptleShare.replace("C (62)", "C (62) ★"),
    perceptleShare + "\nWordle 1 1/6",
  ];
  for (const value of invalid) expect(() => previewScore("perceptle", value)).toThrow();
});

const gazillionShare = "Gazillion #32 · 2,037/5,000\n" +
  "🥇🥉✅🤏❌  top 45%\n" +
  "🐪 Travelled back to the Ancient Egypt (2,792 BC)\n" +
  "Can you beat 2,037?  https://gazillion.world/?s=cp&r=spd7ywd9sp&c=2037&d=32";

test("previews the supplied Gazillion result with verified score, tiers, percentile, and date", () => {
  expect(previewScore("gazillion", gazillionShare)).toEqual({
    puzzleKey: "32",
    puzzleNumber: 32,
    playedOn: "2026-11-23",
    primaryScore: 2037,
    metrics: {
      completionStatus: "WIN",
      totalScore: 2037,
      maximumScore: 5000,
      resultTiers: ["gold", "bronze", "caught", "close", "miss"],
      percentile: 45,
      travelledBackTo: "the Ancient Egypt (2,792 BC)",
      gameMode: "Daily",
      scoreRaw: "2,037/5,000",
      scoreUnit: "points",
      displayScore: "2,037/5,000",
    },
    parserVersion: 1,
  });
});

test("accepts Gazillion boundaries, decorations, official URLs, and every travel era", () => {
  const makeShare = (score: number, tiers: string, era: string, extra = "") => {
    const value = score.toLocaleString("en-US");
    return `${extra}Gazillion #1 · ${value}/5,000\n${tiers}\n${era} Travelled back to somewhere\n` +
      `Can you beat ${value}? 👉 https://gazillion.world`;
  };
  expect(previewScore("gazillion", makeShare(0, "❌❌❌❌❌", "🏙️")).primaryScore).toBe(0);
  expect(previewScore("gazillion", makeShare(5000, "🏆🏆🏆🏆🏆  top 1%", "💥",
    "💎 PERFECT 5,000 · ONE IN A GAZILLION 💎\n").replace("/5,000\n", "/5,000 · 🔥12\n")).metrics)
    .toMatchObject({ percentile: 1, streak: 12 });
  for (const [score, tiers, era] of [
    [699, "✅✅✅✅✅", "🏙️"], [700, "🥉✅✅✅✅", "🏰"], [1400, "🥈🥈✅✅✅", "🐪"],
    [2100, "🥇🥉🥉🥉✅", "🔥"], [2800, "🥇🥇🥉🥉🥉", "🦣"], [3500, "🥇🥇🥈🥈🥈", "🦖"],
    [4200, "🏆🏆🥇🥇🥈", "🌋"], [4800, "🏆🏆🏆🏆🏆", "💥"],
  ] as const) {
    expect(previewScore("gazillion", makeShare(score, tiers, era)).primaryScore).toBe(score);
  }
  expect(previewScore("gazillion", gazillionShare.replace("s=cp&r=spd7ywd9sp", "s=wa")).primaryScore)
    .toBe(2037);
});

test("rejects malformed, mismatched, non-English, non-daily, and future Gazillion shares", () => {
  const invalid = [
    gazillionShare.replace("2,037/5,000", "2037/5,000"),
    gazillionShare.replace("Can you beat 2,037?", "Can you beat 2,038?"),
    gazillionShare.replace("c=2037", "c=2038"),
    gazillionShare.replace("d=32", "d=31"),
    gazillionShare.replace("s=cp", "s=unknown"),
    gazillionShare.replace("r=spd7ywd9sp", "r=bad"),
    gazillionShare.replace("top 45%", "top 51%"),
    gazillionShare.replace("🐪 Travelled", "🔥 Travelled"),
    gazillionShare.replace("🥇🥉✅🤏❌", "🏆🏆🏆🏆🏆"),
    gazillionShare.replace("#32", "#100000").replace("d=32", "d=100000"),
    gazillionShare.replace("Gazillion #32", "Gazillion ∞"),
    gazillionShare.replace("Travelled back to", "He viajado hasta:"),
    `💎 PERFECT 5,000 · ONE IN A GAZILLION 💎\n${gazillionShare}`,
    `${gazillionShare}\nWordle 1 1/6`,
  ];
  for (const value of invalid) expect(() => previewScore("gazillion", value)).toThrow();
});

const dailySetShare = "The Daily Set 🎯 Nov 23\n" +
  "🟩8s 🟨12s 🟨14s 🟩7s 🟥31s 🟨11s → ⏱️ 1:23\n" +
  "https://setpuzzle.com/share/2026-11-23/1-23/regular";

test("previews Daily Set with mode, elapsed time, and optional six-set timing details", () => {
  expect(previewScore("daily-set", dailySetShare)).toEqual({
    puzzleKey: "2026-11-23:regular", playedOn: "2026-11-23", primaryScore: 83,
    metrics: { completionStatus: "WIN", elapsedSeconds: 83, gameMode: "Regular", scoreRaw: "1:23",
      scoreUnit: "seconds", displayScore: "1:23", setTimesSeconds: [8, 12, 14, 7, 31, 11] },
    parserVersion: 1,
  });
  expect(previewScore("daily-set", "The Daily Set 🔥 Nov 23\n" +
    "https://setpuzzle.com/share/2026-11-23/2-05/diablo")).toMatchObject({
    primaryScore: 125, metrics: { gameMode: "Diablo" },
  });
});

test("rejects mismatched Daily Set modes, dates, bands, totals, and mixed shares", () => {
  for (const share of [
    dailySetShare.replace("🎯", "🔥"),
    dailySetShare.replace("Nov 23", "Nov 22"),
    dailySetShare.replace("🟩8s", "🟨8s"),
    dailySetShare.replace("🟨11s", "🟨21s"),
    `${dailySetShare}\nWordle 1 1/6`,
  ]) expect(() => previewScore("daily-set", share)).toThrow();
});

const dailyOrbsShare = "DailyOrbs November 23 2026\n" +
  "https://DailyOrbs.com/2026-11-23?utm_source=share\n" +
  "🟠🧡🟠🟢💚🟢🔵🔵🏆🟣🟣";

test("previews Daily Orbs from its orb and heart event narrative", () => {
  expect(previewScore("daily-orbs", dailyOrbsShare)).toEqual({
    puzzleKey: "2026-11-23", playedOn: "2026-11-23", primaryScore: 8,
    metrics: { completionStatus: "WIN", orbTotal: 8, orangeOrbs: 2, greenOrbs: 2, blueOrbs: 2,
      purpleOrbs: 2, eventSequence: "🟠🧡🟠🟢💚🟢🔵🔵🏆🟣🟣", gameMode: "Daily",
      heartsDisclosed: true, scoreRaw: "8/12 orbs", scoreUnit: "orbs", displayScore: "8/12 orbs",
      heartLosses: 2, orangeHeartsLost: 1, greenHeartsLost: 1, blueHeartsLost: 0, purpleHeartsLost: 0 },
    parserVersion: 1,
  });
  expect(previewScore("daily-orbs", "DailyOrbs November 23 2026\n" +
    "https://dailyorbs.com/2026-11-23?utm_source=share\n🟠🟠🟠🟢🟢🟢🏆")).toMatchObject({
    primaryScore: 6, metrics: { heartsDisclosed: false },
  });
});

test("rejects incomplete, mistimed-trophy, invalid-count, and mixed Daily Orbs shares", () => {
  for (const share of [
    dailyOrbsShare.replace("🔵🔵🏆", "🔵🏆🔵"),
    dailyOrbsShare.replace("🏆", ""),
    "DailyOrbs November 23 2026\nhttps://dailyorbs.com/2026-11-23?utm_source=share\n🟠🟠🟠🟠🟢🟢🏆",
    `${dailyOrbsShare}\nWordle 1 1/6`,
  ]) expect(() => previewScore("daily-orbs", share)).toThrow();
});

const minuteCrypticShare = "Minute Cryptic - 23 November, 2026\n" +
  "\"Kitchen cleaners yelled 'You left sugar on the counter!'\" (4)\n" +
  "🟣🟣🟣🟣🟣🟣🟣\n" +
  "🏆 0 hints – 1 under the community par (101,965 solvers so far). Time: 1m 59s.\n" +
  "https://www.minutecryptic.com/?utm_source=share";

test("previews current and legacy Minute Cryptic shares using hints as the rank score", () => {
  expect(previewScore("minute-cryptic", minuteCrypticShare)).toEqual({
    puzzleKey: "2026-11-23", playedOn: "2026-11-23", primaryScore: 0,
    metrics: { completionStatus: "WIN", hints: 0, communityParDelta: -1,
      clue: "Kitchen cleaners yelled 'You left sugar on the counter!' (4)", symbolRow: "🟣🟣🟣🟣🟣🟣🟣",
      shareFormat: "current", scoreRaw: "0 hints", scoreUnit: "hints", displayScore: "0 hints",
      solverCount: 101965, completionTimeSeconds: 119 },
    parserVersion: 1,
  });
  const legacy = "Minute Cryptic - 30 June, 2024\n\"Tell us what you think of 1 divided by 3.14\" (5)\n" +
    "🟪🟨🟪🟪🟪\nI scored: 1 under par\nhttps://www.minutecryptic.com";
  expect(previewScore("minute-cryptic", legacy)).toMatchObject({
    primaryScore: 1, metrics: { hints: 1, communityParDelta: -1, shareFormat: "legacy" },
  });
});

test("rejects inconsistent Minute Cryptic hints, icons, times, URLs, and mixed shares", () => {
  for (const share of [
    minuteCrypticShare.replace("0 hints", "1 hints"),
    minuteCrypticShare.replace("🏆 0 hints", "🤝 0 hints"),
    minuteCrypticShare.replace("🏆 0 hints – 1 under", "🤝 0 hints – 0 under"),
    minuteCrypticShare.replace("1m 59s", "1m 60s"),
    minuteCrypticShare.replace("minutecryptic.com", "example.com"),
    `${minuteCrypticShare}\nWordle 1 1/6`,
  ]) expect(() => previewScore("minute-cryptic", share)).toThrow();
});

test("keeps Nerdle and Globle browser previews strict and equivalent to their backend contracts", () => {
  const nerdle = "nerdlegame 1622 3/6\n🟪⬛️⬛️⬛️🟪🟩⬛️⬛️\n🟩⬛️🟩🟩⬛️🟩🟩⬛️\n🟩🟩🟩🟩🟩🟩🟩🟩";
  expect(previewScore("nerdle", nerdle)).toMatchObject({
    puzzleKey: "1622", puzzleNumber: 1622, playedOn: "2026-06-29", primaryScore: 3,
    metrics: { completionStatus: "WIN", attemptsUsed: 3, attemptsMaximum: 6, scoreRaw: "3/6" },
  });
  expect(() => previewScore("nerdle", `${nerdle}\nWordle 1 1/6`)).toThrow();

  const globle = "🌎 Aug 21, 2026 🌍\n🔥 5 | Avg. Guesses: 7.4\n🟨🟥🟥🟥🟥🟥🟩 = 7\n" +
    "https://globle-game.com/\n#globle";
  expect(previewScore("globle", globle)).toMatchObject({
    puzzleKey: "2026-08-21", playedOn: "2026-08-21", primaryScore: 7,
    metrics: { completionStatus: "WIN", attemptsUsed: 7, proximityGrid: "🟨🟥🟥🟥🟥🟥🟩" },
  });
  expect(() => previewScore("globle", globle.replace("globle-game.com", "example.com"))).toThrow();
});
