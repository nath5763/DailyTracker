import { readFile } from "node:fs/promises";

const oldPaths = [".load-test-fixture-1000.json", ".load-test-fixture-25.json"];
const newPath = process.env.NEW_LOAD_TEST_FIXTURE ?? ".load-test-fixture-20.json";
const oldFixtures = await Promise.all(oldPaths.map(async path => JSON.parse(await readFile(path, "utf8"))));
const newFixture = JSON.parse(await readFile(newPath, "utf8"));
const baseUrl = newFixture.baseUrl?.replace(/\/$/, "");

if (!baseUrl?.startsWith("https://") ||
    ["dailytracker.cc", "www.dailytracker.cc"].includes(new URL(baseUrl).hostname))
  throw new Error("The new fixture must point to a non-production HTTPS app.");
if (newFixture.boardSize !== 20 || newFixture.users?.length !== 1000 ||
    newFixture.completedScoreIndexes?.length !== 1000 || newFixture.boards?.length !== 50 ||
    newFixture.boards.some(board => board.memberIndexes?.length !== 20))
  throw new Error("Complete the 50-board, 20-member seed before removing old boards.");
const newUserIds = new Set(newFixture.users.map(user => user.userId));
for (const [index, oldFixture] of oldFixtures.entries()) {
  if (oldFixture.baseUrl !== baseUrl || oldFixture.boards?.length !== [24, 4][index] ||
      oldFixture.users?.some(user => !newUserIds.has(user.userId)) ||
      oldFixture.boards.some(board => !board.id || !board.name?.startsWith(`Load ${oldFixture.seedId} `) ||
        !oldFixture.users[board.ownerIndex]?.cookie))
    throw new Error(`Old fixture ${oldPaths[index]} does not match the expected staging boards and users.`);
}

async function request(path, cookie, method = "GET") {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Cookie: cookie, Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok && response.status !== 404)
    throw new Error(`${method} ${path} returned ${response.status}.`);
  return response;
}

for (const board of newFixture.boards) {
  const cookie = newFixture.users[board.ownerIndex]?.cookie;
  if (!cookie) throw new Error(`Missing owner session for new board ${board.name}.`);
  const response = await request(`/api/v1/leaderboards/${board.id}?range=30d`, cookie);
  if (response.status !== 200) throw new Error(`New board ${board.name} is missing.`);
  const live = await response.json();
  const expected = new Set(board.memberIndexes.map(index => newFixture.users[index]?.userId));
  if (live.id !== board.id || live.name !== board.name || live.members?.length !== 20 ||
      live.members.some(member => !expected.has(member.userId)))
    throw new Error(`New board ${board.name} does not have the expected 20 members.`);
}
process.stdout.write("Verified all 50 new boards have their expected 20 members.\n");

for (const [fixtureIndex, oldFixture] of oldFixtures.entries()) {
  for (const [index, board] of oldFixture.boards.entries()) {
    const cookie = oldFixture.users[board.ownerIndex].cookie;
    const path = `/api/v1/leaderboards/${board.id}`;
    const response = await request(path, cookie);
    if (response.status === 404) continue;
    const live = await response.json();
    if (live.id !== board.id || live.name !== board.name || live.ownerId !== oldFixture.users[board.ownerIndex].userId)
      throw new Error(`Old board ${board.name} no longer matches the fixture; stopping.`);
    const deleted = await request(path, cookie, "DELETE");
    if (deleted.status !== 204 && deleted.status !== 404)
      throw new Error(`Could not remove old board ${board.name}: HTTP ${deleted.status}.`);
    process.stdout.write(`Removed old fixture ${fixtureIndex + 1} board ${index + 1}/${oldFixture.boards.length}.\n`);
  }
}

for (const oldFixture of oldFixtures) {
  for (const board of oldFixture.boards) {
    const response = await request(`/api/v1/leaderboards/${board.id}`, oldFixture.users[board.ownerIndex].cookie);
    if (response.status !== 404) throw new Error(`Old board ${board.name} still exists.`);
  }
}
process.stdout.write("All 28 legacy boards are gone; 50 verified 20-member boards remain.\n");
