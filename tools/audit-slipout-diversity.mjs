import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const levels = JSON.parse(fs.readFileSync("lib/slipout/levels.json", "utf8")).slice(1);

function point(x, y, turn, reflect) {
  for (let i = 0; i < turn; i++) [x, y] = [5 - y, x];
  if (reflect) x = 5 - x;
  return [x, y];
}

function form(level, turn, reflect) {
  const target = new Set(), obstacles = new Set(), switches = new Set();
  level.blocks.forEach((block, index) => {
    const cells = [];
    for (let x = block.x; x < block.x + block.width; x++)
      for (let y = block.y; y < block.y + block.height; y++) cells.push(point(x, y, turn, reflect));
    if (index === 0) cells.forEach(([x, y]) => target.add(`${x},${y}`));
    else {
      const kind = block.width > 1 ? `H${block.width}` : `V${block.height}`;
      const rotated = turn % 2 ? (kind[0] === "H" ? "V" : "H") + kind.slice(1) : kind;
      cells.forEach(([x, y]) => obstacles.add(`${rotated}:${x},${y}`));
    }
  });
  level.switches.forEach(({ x, y }) => { const [a, b] = point(x, y, turn, reflect); switches.add(`${a},${b}`); });
  const { side, cell } = level.exit;
  const inside = side === "left" ? [0, cell] : side === "right" ? [5, cell] : side === "top" ? [cell, 0] : [cell, 5];
  const outside = side === "left" ? [-1, cell] : side === "right" ? [6, cell] : side === "top" ? [cell, -1] : [cell, 6];
  const [ix, iy] = point(...inside, turn, reflect), [ox, oy] = point(...outside, turn, reflect);
  return { target, obstacles, switches, exit: `${ix},${iy}:${ox},${oy}`,
    axis: turn % 2 ? (level.startAxis === "H" ? "V" : "H") : level.startAxis };
}

function jaccard(a, b) {
  const shared = [...a].filter(value => b.has(value)).length;
  return shared / (a.size + b.size - shared || 1);
}

export function similarity(a, b) {
  const identity = form(a, 0, false);
  let best = 0;
  for (let turn = 0; turn < 4; turn++) for (const reflect of [false, true]) {
    const other = form(b, turn, reflect);
    const score = .58 * jaccard(identity.obstacles, other.obstacles)
      + .14 * jaccard(identity.target, other.target)
      + .13 * jaccard(identity.switches, other.switches)
      + .1 * Number(identity.exit === other.exit)
      + .05 * Number(identity.axis === other.axis);
    best = Math.max(best, score);
  }
  return best;
}

export function canonical(level) {
  const forms = [];
  for (let turn = 0; turn < 4; turn++) for (const reflect of [false, true]) {
    const value = form(level, turn, reflect);
    forms.push(JSON.stringify([
      [...value.target].sort(), [...value.obstacles].sort(), [...value.switches].sort(), value.exit, value.axis
    ]));
  }
  return forms.sort()[0];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const pairs = [];
for (let i = 0; i < levels.length; i++) for (let j = i + 1; j < levels.length; j++) {
  const score = similarity(levels[i], levels[j]);
  pairs.push({ a: levels[i], b: levels[j], score });
}
pairs.sort((a, b) => b.score - a.score);
const exact = new Map();
for (const level of levels) {
  const key = canonical(level);
  exact.set(key, [...(exact.get(key) ?? []), level]);
}
const groups = [...exact.values()].filter(group => group.length > 1);
if (process.argv.includes("--check")) {
  const worst = pairs[0];
  console.log(`SlipOut diversity: ${groups.length} equivalent groups; closest pair ${worst.a.number}/${worst.b.number} = ${worst.score.toFixed(4)} (limit 0.8500)`);
  if (groups.length || worst.score >= .85) process.exitCode = 1;
  process.exit();
}
console.log(`${groups.length} exact orientation-equivalent groups, ${groups.reduce((sum, group) => sum + group.length - 1, 0)} redundant levels`);
for (const group of groups) console.log(group.map(level => `${level.difficulty[0]}#${level.number}`).join(" "));
for (const threshold of [.95, .9, .85, .8, .75, .7])
  console.log(`pairs >= ${threshold}: ${pairs.filter(pair => pair.score >= threshold).length}`);
for (const tier of ["easy", "medium", "hard"]) {
  console.log(`${tier} nearest neighbors:`);
  for (const level of levels.filter(item => item.difficulty === tier)) {
    const nearest = pairs.find(pair => pair.a === level || pair.b === level);
    const neighbor = nearest.a === level ? nearest.b : nearest.a;
    console.log(`  #${level.number} -> ${neighbor.difficulty[0]}#${neighbor.number} ${nearest.score.toFixed(3)}`);
  }
}
console.log("Closest layouts (rotations/reflections included):");
for (const { a, b, score } of pairs.slice(0, 60))
  console.log(`${score.toFixed(3)}  ${a.difficulty} #${a.number}  ${b.difficulty} #${b.number}`);
for (const tier of ["easy", "medium", "hard"]) {
  const group = levels.filter(level => level.difficulty === tier).sort((a, b) => a.optimalMoves - b.optimalMoves || a.number - b.number);
  const close = [];
  for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
    const score = similarity(group[i], group[j]);
    if (score >= .68) close.push({ a: i + 1, b: j + 1, score });
  }
  console.log(`${tier}: ${close.length} pairs at or above 0.68`);
  for (const pair of close.sort((a, b) => b.score - a.score).slice(0, 20))
    console.log(`  slots ${pair.a}/${pair.b} ${pair.score.toFixed(3)}`);
}
}
