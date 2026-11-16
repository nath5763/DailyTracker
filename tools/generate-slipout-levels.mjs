// Offline curator for the fixed level catalog. Run with `node tools/generate-slipout-levels.mjs`.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('lib/slipout/level-engine.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(js, context);
const { validLevel, initialLevelState, levelRange, applyLevelMove, solveLevelPath } = context.exports;
const catalog = JSON.parse(fs.readFileSync('lib/slipout/levels.json', 'utf8'));
const original = catalog.slice(0, 61);
const tiers = fs.existsSync('tools/generated-slipout-levels.json')
  ? JSON.parse(fs.readFileSync('tools/generated-slipout-levels.json', 'utf8')) : { easy: [], medium: [], hard: [] };
const limits = { easy: [6, 12, .5], medium: [13, 19, .75], hard: [20, 40, .9] };
const bases = { easy: [19, 20, 24, 25, 29, 30], medium: [46, 47, 48, 49, 51, 52, 53, 54, 56, 57, 58, 59], hard: [46, 47, 48, 49, 51, 52, 53, 54, 56, 57, 58, 59] };
let seed = 9243751;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
function choose(items) { return items[Math.floor(random() * items.length)]; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function rectsOverlap(a, b) { return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y; }
function canonical(level) {
  const forms = [];
  for (let turn = 0; turn < 4; turn++) for (let reflect = 0; reflect < 2; reflect++) {
    const point = (x, y) => { for (let n=0;n<turn;n++) [x,y]=[5-y,x]; if(reflect) x=5-x; return [x,y]; };
    const blocks = level.blocks.map(b => {
      const pts = [[b.x,b.y],[b.x+b.width-1,b.y],[b.x,b.y+b.height-1],[b.x+b.width-1,b.y+b.height-1]].map(([x,y])=>point(x,y));
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
      return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs)+1,Math.max(...ys)-Math.min(...ys)+1].join(',');
    });
    const edge = level.exit.side === 'left' ? [0,level.exit.cell,-1,level.exit.cell] : level.exit.side === 'right' ? [5,level.exit.cell,6,level.exit.cell] : level.exit.side === 'top' ? [level.exit.cell,0,level.exit.cell,-1] : [level.exit.cell,5,level.exit.cell,6];
    const [ix,iy]=point(edge[0],edge[1]);
    // Transform the outside point by extending the same affine transform.
    const outside = (()=> { let [x,y]=edge.slice(2); for(let n=0;n<turn;n++) [x,y]=[5-y,x]; if(reflect)x=5-x; return [x,y]; })();
    forms.push(JSON.stringify([blocks[0], blocks.slice(1).sort(),level.switches.map(s=>point(s.x,s.y).join(',')).sort(),`${ix},${iy}:${outside.join(',')}`,turn%2 ? level.startAxis==='H'?'V':'H' : level.startAxis]));
  }
  return forms.sort()[0];
}
const signatures = new Set([...original,...Object.values(tiers).flat().map(item=>item.level)].map(canonical));
function mutate(base, count) {
  const level=clone(base);
  for (let n=0;n<count;n++) {
    const b=choose(level.blocks.slice(1));
    const options=[];
    for (let x=0;x<=6-b.width;x++) for(let y=0;y<=6-b.height;y++) {
      if (b.axis==='H' && y!==b.y || b.axis==='V' && x!==b.x || x===b.x && y===b.y) continue;
      const shifted={...b,x,y};
      if(level.blocks.every(other=>other.id===b.id || !rectsOverlap(shifted,other))) options.push(shifted);
    }
    if(options.length) Object.assign(b,choose(options));
  }
  if(random()<.35) {
    const index=Math.floor(random()*level.switches.length);
    const cells=[]; for(let x=0;x<6;x++)for(let y=0;y<6;y++) if(!level.switches.some((s,i)=>i!==index&&s.x===x&&s.y===y)) cells.push({x,y});
    level.switches[index]=choose(cells);
  }
  return level;
}
function evaluate(level, path) {
  const [min,max,blockFraction]=limits[level.difficulty];
  if (!path || path.length<min || path.length>max) return null;
  let state=initialLevelState(level), changes=0, obstacles=0;
  const moved=new Set();
  for(const move of path) {
    const next=applyLevelMove(level,state,move);
    if(move.id==='X') changes+=state.activeAxis!==next.state.activeAxis?1:0;
    else { obstacles++; moved.add(move.id); }
    state=next.state;
  }
  if(changes<1 || changes>3 || obstacles/path.length<.6 || moved.size<Math.ceil((level.blocks.length-1)*blockFraction)) return null;
  return {changes,obstacles,moved:moved.size};
}
function allShortest(level, length) {
  // Track each shortest route's counts and used-block mask. Merging identical
  // state/metrics makes this tractable even when slides commute.
  const key=s=>`${s.activeAxis}:${s.blocks.map(b=>`${b.x},${b.y}`).join(';')}`;
  let frontier=new Map([[key(initialLevelState(level)),{state:initialLevelState(level),routes:new Map([['0,0,0',{changes:0,obstacles:0,mask:0}]])}]]);
  const seenDepth=new Map([[key(initialLevelState(level)),0]]);
  const required=Math.ceil((level.blocks.length-1)*limits[level.difficulty][2]);
  for(let depth=0;depth<length;depth++) {
    const nextFrontier=new Map(); let exits=0;
    for(const {state,routes} of frontier.values()) for(const block of state.blocks) {
      const axis=block.id==='X'?state.activeAxis:block.axis;
      const [low,high]=levelRange(level,state,block.id,axis);
      const origin=axis==='H'?block.x:block.y;
      for(let to=low;to<=high;to++) {
        if(to===origin || to<0&&to!==-1 || to>6-(axis==='H'?block.width:block.height)&&to!==6)continue;
        const move={id:block.id,axis,to}, result=applyLevelMove(level,state,move);
        if(result.exited && depth!==length-1) throw Error('Found shorter solution');
        if(!result.exited && depth===length-1)continue;
        const signature=result.exited?'EXIT':key(result.state);
        if(!result.exited && seenDepth.has(signature) && seenDepth.get(signature)<depth+1)continue;
        if(!result.exited)seenDepth.set(signature,depth+1);
        let entry=nextFrontier.get(signature);
        if(!entry) {entry={state:result.state,routes:new Map()};nextFrontier.set(signature,entry);}
        for(const route of routes.values()) {
          const changes=route.changes+(block.id==='X'&&state.activeAxis!==result.state.activeAxis?1:0);
          const obstacles=route.obstacles+(block.id!=='X'?1:0);
          const mask=route.mask|(block.id==='X'?0:1<<(level.blocks.indexOf(block)-1));
          const metric=`${changes},${obstacles},${mask}`;
          entry.routes.set(metric,{changes,obstacles,mask});
        }
        if(result.exited) exits++;
      }
    }
    frontier=nextFrontier;
    if(frontier.size>100000) return false;
    if(depth===length-1) {
      const goal=frontier.get('EXIT');
      if(!goal?.routes.size || !exits) return false;
      // Exact all-path verification below checks paths that were pruned above.
      return [...goal.routes.values()].every(r=>r.changes>=1&&r.changes<=3&&r.obstacles/length>=.6&&r.mask.toString(2).replaceAll('0','').length>=required);
    }
  }
  return false;
}
for(const difficulty of Object.keys(tiers)) {
  let attempts=0;
  while(tiers[difficulty].length<10 && attempts<20000) {
    attempts++;
    const prior=tiers[difficulty];
    const fromPrior=prior.length>0 && random()<.8;
    const base=clone(fromPrior?choose(prior).level:original[choose(bases[difficulty])]);
    base.difficulty=difficulty;
    if(difficulty==='medium' && !fromPrior) {
      const remove=1+Math.floor(random()*4);
      for(let n=0;n<remove;n++) base.blocks.splice(1+Math.floor(random()*(base.blocks.length-1)),1);
    }
    const candidate=mutate(base,difficulty==='medium'?Math.floor(random()*3):1+Math.floor(random()*3));
    if(!validLevel(candidate))continue;
    const signature=canonical(candidate);
    if(signatures.has(signature))continue;
    const path=solveLevelPath(candidate,300000);
    const metrics=evaluate(candidate,path);
    if(!metrics)continue;
    if(!allShortest(candidate,path.length))continue;
    signatures.add(signature);
    candidate.id=`slipout-level-v5-${String(61+Object.values(tiers).flat().length).padStart(2,'0')}`;
    candidate.number=61+Object.values(tiers).flat().length;
    candidate.optimalMoves=path.length;
    tiers[difficulty].push({level:candidate,path,metrics});
    console.log(difficulty,tiers[difficulty].length,attempts,candidate.optimalMoves,metrics);
    fs.writeFileSync('tools/generated-slipout-levels.json',JSON.stringify(tiers,null,2)+'\n');
  }
  console.log('completed',difficulty,tiers[difficulty].length,'attempts',attempts);
}
fs.writeFileSync('tools/generated-slipout-levels.json',JSON.stringify(tiers,null,2)+'\n');
if (catalog.length !== 91 || Object.values(tiers).some(group => group.length !== 10))
  throw Error('Expected tutorial and 90 curated levels');
const verified = new Set(original.map(canonical));
for (const [index, {level, path}] of Object.values(tiers).flat().entries()) {
  if (level.number !== index + 61 || JSON.stringify(level) !== JSON.stringify(catalog[index + 61]) ||
      !validLevel(level) || verified.has(canonical(level)))
    throw Error(`Invalid or duplicate level ${level.number}`);
  verified.add(canonical(level));
  const shortest=solveLevelPath(level,300000);
  if (!shortest || shortest.length !== level.optimalMoves || !evaluate(level,path) || !allShortest(level,shortest.length))
    throw Error(`Failed shortest-route verification for level ${level.number}`);
  console.log('verified',level.number,level.optimalMoves);
}
