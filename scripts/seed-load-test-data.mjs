import { createHash, randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";

const gameSlugs = ["wordle", "connections", "queens", "pinpoint", "crossclimb", "fermi", "tango", "zip", "contexto", "strands"];
const accountPath = process.env.LOAD_TEST_ACCOUNTS ?? ".load-test-accounts-1000.json";
const outputPath = process.env.LOAD_TEST_FIXTURE ?? ".load-test-fixture-20.json";
const concurrency = Number(process.env.LOAD_TEST_SEED_CONCURRENCY ?? "4");
const boardSize = 20;
const scoreOffsets = [1, 2, 8, 15];

function positiveInteger(value, name, max = 1000) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`${name} must be 1–${max}.`);
}

function dateDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function scoreValues(game, userIndex, dayIndex) {
  const variation = userIndex * 7 + dayIndex * 11;
  switch (game) {
    case "wordle": return { completionStatus: "WIN", values: { attempts: variation % 6 + 1, hardMode: variation % 3 === 0 } };
    case "connections": {
      const wrongGroups = variation % 5;
      return { completionStatus: wrongGroups === 4 ? "LOSS" : "WIN", values: { wrongGroups } };
    }
    case "queens": return { completionStatus: "WIN", values: { completionTimeSeconds: 35 + variation % 180, mistakes: variation % 3 } };
    case "pinpoint": return { completionStatus: "WIN", values: { attempts: variation % 5 + 1 } };
    case "crossclimb": return { completionStatus: "WIN", values: { completionTimeSeconds: 45 + variation % 240, hints: variation % 2 } };
    case "fermi": return { completionStatus: "WIN", values: { score: Number((0.5 + variation % 60 / 10).toFixed(2)) } };
    case "tango": return { completionStatus: "WIN", values: { completionTimeSeconds: 30 + variation % 200, hints: variation % 2 } };
    case "zip": return { completionStatus: "WIN", values: { completionTimeSeconds: 20 + variation % 160, backtracks: variation % 4 } };
    case "contexto": return { completionStatus: "WIN", values: { attempts: variation % 400 + 1, hints: variation % 3 } };
    case "strands": return { completionStatus: "WIN", values: { hints: variation % 5 } };
    default: throw new Error(`Unsupported seed game: ${game}`);
  }
}

async function api(baseUrl, path, { method = "GET", cookie, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method, signal: AbortSignal.timeout(25_000),
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`${method} ${path}: ${response.status} ${error.code ?? response.statusText}`);
  }
  return response;
}

async function limited(items, work) {
  let next = 0;
  const failures = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      try { await work(items[index], index); }
      catch (error) { failures.push(error.message); process.stderr.write(`${error.message}\n`); }
    }
  }));
  return failures;
}

function boardPlan(userCount, seedId) {
  const boards = [];
  for (let start = 0; start < userCount; start += boardSize) {
    const number = boards.length + 1;
    const gameSlug = gameSlugs[(number - 1) % gameSlugs.length];
    boards.push({ name: `Load ${seedId} B${String(number).padStart(2, "0")} ${gameSlug}`,
      gameSlug, ownerIndex: start,
      memberIndexes: Array.from({ length: Math.min(boardSize, userCount - start) }, (_, offset) => start + offset) });
  }
  return boards;
}

async function main() {
  positiveInteger(concurrency, "LOAD_TEST_SEED_CONCURRENCY", 16);
  const accountFile = JSON.parse(await readFile(accountPath, "utf8"));
  const baseUrl = accountFile.baseUrl?.replace(/\/$/, "");
  if (!baseUrl?.startsWith("https://") || new URL(baseUrl).pathname !== "/" ||
      ["dailytracker.cc", "www.dailytracker.cc"].includes(new URL(baseUrl).hostname))
    throw new Error("Account file must point to the HTTPS staging origin.");
  const accounts = accountFile.accounts;
  if (!Array.isArray(accounts) || !accounts.length || accountFile.failures?.length ||
      (accountFile.targetCount && accounts.length !== accountFile.targetCount))
    throw new Error("Account provisioning must complete before seeding.");
  const accountHash = createHash("sha256").update(accounts.map(account => account.email).join("\n")).digest("hex");
  let state;
  try {
    state = JSON.parse(await readFile(outputPath, "utf8"));
    if (state.baseUrl !== baseUrl || state.accountHash !== accountHash || state.users.length !== accounts.length ||
        state.boardSize !== boardSize || state.boards.some(board => board.memberIndexes.length > boardSize))
      throw new Error("Existing fixture belongs to a different account batch.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    state = { baseUrl, accountHash, seedId: randomBytes(4).toString("hex"), boardSize,
      scoreDates: scoreOffsets.map(dateDaysAgo), users: Array(accounts.length).fill(null), boards: [], completedScoreIndexes: [] };
    await writeFile(outputPath, JSON.stringify(state, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  }
  let saveQueue = Promise.resolve();
  function save() {
    const snapshot = JSON.stringify(state, null, 2) + "\n";
    saveQueue = saveQueue.then(async () => {
      const tempPath = `${outputPath}.tmp`;
      await writeFile(tempPath, snapshot, { mode: 0o600 });
      await rename(tempPath, outputPath);
    });
    return saveQueue;
  }

  const missingUsers = accounts.map((account, index) => ({ account, index })).filter(({ index }) => !state.users[index]);
  let profileCount = state.users.filter(Boolean).length;
  const profileFailures = await limited(missingUsers, async ({ account, index }) => {
    const login = await api(baseUrl, "/api/v1/auth/login", { method: "POST", body: account });
    const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    if (!cookie?.startsWith("daily_tracker_session=")) throw new Error(`Missing session cookie for account ${index}.`);
    const me = await api(baseUrl, "/api/v1/me", { cookie }).then(response => response.json());
    if (!me.profile?.shareId || !me.user?.id) throw new Error(`Missing profile for account ${index}.`);
    state.users[index] = { email: account.email, userId: me.user.id, shareId: me.profile.shareId, cookie };
    profileCount++;
    if (profileCount % 25 === 0) { await save(); process.stdout.write(`Profiles ${profileCount}/${accounts.length}\n`); }
  });
  await saveQueue;
  await save();
  if (profileFailures.length) throw new Error(`${profileFailures.length} profiles failed; rerun to retry.`);

  const available = await api(baseUrl, "/api/v1/games", { cookie: state.users[0].cookie })
    .then(response => response.json());
  for (const slug of gameSlugs) {
    const game = available.find(item => item.slug === slug);
    if (!game?.manualEntry?.supported) throw new Error(`Game ${slug} does not support manual results.`);
  }
  const planned = boardPlan(accounts.length, state.seedId);
  const boardByName = new Map(state.boards.map(board => [board.name, board]));
  for (const plan of planned) {
    if (boardByName.has(plan.name)) continue;
    const cookie = state.users[plan.ownerIndex].cookie;
    const owned = await api(baseUrl, "/api/v1/leaderboards", { cookie }).then(response => response.json());
    let id = owned.find(board => board.name === plan.name)?.id;
    if (!id) id = (await api(baseUrl, "/api/v1/leaderboards", { method: "POST", cookie,
      body: { name: plan.name, gameSlug: plan.gameSlug, boardType: "SINGLE_GAME" } })
      .then(response => response.json())).id;
    if (!id) throw new Error(`Board creation returned no ID for ${plan.name}.`);
    const board = { ...plan, id };
    state.boards.push(board);
    boardByName.set(plan.name, board);
    await save();
    process.stdout.write(`Boards ${state.boards.length}/${planned.length}\n`);
  }

  for (const board of state.boards) {
    const cookie = state.users[board.ownerIndex].cookie;
    const detail = await api(baseUrl, `/api/v1/leaderboards/${board.id}?range=30d`, { cookie })
      .then(response => response.json());
    const existing = new Set(detail.members.map(member => member.userId));
    const missing = board.memberIndexes.filter(index => !existing.has(state.users[index].userId));
    const failures = await limited(missing, async index => {
      try {
        await api(baseUrl, `/api/v1/leaderboards/${board.id}/members`, { method: "POST", cookie,
          body: { shareId: state.users[index].shareId } });
      } catch (error) {
        if (!error.message.includes("409 ALREADY_MEMBER")) throw error;
      }
    });
    if (failures.length) throw new Error(`${failures.length} memberships failed for ${board.name}; rerun to retry.`);
    process.stdout.write(`Members ${board.name}: ${board.memberIndexes.length}\n`);
  }

  const boardGamesByUser = Array.from({ length: accounts.length }, () => new Set());
  for (const board of state.boards) for (const index of board.memberIndexes)
    boardGamesByUser[index].add(board.gameSlug);
  const completed = new Set(state.completedScoreIndexes);
  const missingScores = accounts.map((_, index) => index).filter(index => !completed.has(index));
  let scoreUsers = completed.size;
  const scoreFailures = await limited(missingScores, async index => {
    const cookie = state.users[index].cookie;
    for (const game of boardGamesByUser[index]) {
      for (const [dayIndex, puzzleDate] of state.scoreDates.entries()) {
        const body = { game, puzzleDate, ...scoreValues(game, index, dayIndex) };
        await api(baseUrl, "/api/v1/submissions/manual", { method: "POST", cookie, body });
      }
    }
    state.completedScoreIndexes.push(index);
    scoreUsers++;
    if (scoreUsers % 25 === 0) { await save(); process.stdout.write(`Scores ${scoreUsers}/${accounts.length} users\n`); }
  });
  await saveQueue;
  await save();
  if (scoreFailures.length) throw new Error(`${scoreFailures.length} users had score failures; rerun to retry.`);
  process.stdout.write(`Ready: ${accounts.length} users, ${state.boards.length} boards, `
    + `${state.boards.reduce((sum, board) => sum + board.memberIndexes.length, 0)} memberships, `
    + `${state.completedScoreIndexes.length} users with results. Saved ${outputPath}\n`);
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
