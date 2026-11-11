import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const fixture = JSON.parse(open(__ENV.FIXTURE_FILE || "../.load-test-fixture-20.json"));
const baseUrl = fixture.baseUrl?.replace(/\/$/, "");
const users = fixture.users;
const boards = fixture.boards;
const targetVus = Number(__ENV.TARGET_VUS || "1000");
const pauseSeconds = Number(__ENV.PAUSE_SECONDS || "15");
const stepDuration = __ENV.STEP_DURATION || "1m";
const finalRampDuration = __ENV.FINAL_RAMP_DURATION || "2m";
const holdDuration = __ENV.HOLD_DURATION || "3m";

if (!baseUrl?.startsWith("https://") || /https:\/\/(?:www\.)?dailytracker\.cc(?:\/|$)/i.test(baseUrl))
  throw new Error("Fixture must point to the HTTPS load-testing app, not production.");
if (!Array.isArray(users) || users.some(user => !user?.cookie || !user.userId) ||
    !Array.isArray(boards) || !boards.length || fixture.completedScoreIndexes?.length !== users.length)
  throw new Error("Finish account and leaderboard seeding before running k6.");
if (fixture.boardSize !== 20 || boards.some(board => !Array.isArray(board.memberIndexes) ||
    board.memberIndexes.length < 1 || board.memberIndexes.length > 20))
  throw new Error("This test requires leaderboards with at most 20 members. Reseed the 20-member fixture.");
if (!Number.isSafeInteger(targetVus) || targetVus < 1 || targetVus > users.length)
  throw new Error("TARGET_VUS must be between 1 and the number of seeded users.");
if (!Number.isFinite(pauseSeconds) || pauseSeconds < 0)
  throw new Error("PAUSE_SECONDS must be nonnegative.");

const boardsByUser = Array.from({ length: users.length }, () => []);
for (const board of boards) {
  if (!board.id || !board.gameSlug || !Array.isArray(board.memberIndexes))
    throw new Error("Fixture has an incomplete leaderboard.");
  for (const index of board.memberIndexes) boardsByUser[index].push(board);
}
if (boardsByUser.slice(0, targetVus).some(values => !values.length))
  throw new Error("Every k6 user needs at least one seeded leaderboard.");

const pageDuration = new Trend("board_page_html_duration", true);
const listDuration = new Trend("board_list_api_duration", true);
const detailDuration = new Trend("board_detail_api_duration", true);
const insightsDuration = new Trend("board_insights_api_duration", true);

const level = fraction => Math.max(1, Math.round(targetVus * fraction));
export const options = {
  scenarios: {
    leaderboard_pages: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: stepDuration, target: level(0.025) },
        { duration: stepDuration, target: level(0.1) },
        { duration: stepDuration, target: level(0.25) },
        { duration: stepDuration, target: level(0.5) },
        { duration: finalRampDuration, target: targetVus },
        { duration: holdDuration, target: targetVus },
        { duration: stepDuration, target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: { checks: ["rate>0.99"], http_req_failed: ["rate<0.01"] },
};

export default function leaderboardPageLoad() {
  const index = __VU - 1;
  const user = users[index];
  const choices = boardsByUser[index];
  const board = choices[__ITER % choices.length];
  const range = ["7d", "30d", "all"][__ITER % 3];
  const query = `game=${encodeURIComponent(board.gameSlug)}&range=${range}`;
  const cookie = { Cookie: user.cookie };

  const page = http.get(`${baseUrl}/leaderboards/${board.id}?${query}`, {
    headers: cookie, redirects: 0, tags: { name: "GET leaderboard HTML" },
  });
  pageDuration.add(page.timings.duration);
  check(page, { "leaderboard HTML returns 200": response => response.status === 200 });

  const list = http.get(`${baseUrl}/api/v1/leaderboards`, {
    headers: cookie, tags: { name: "GET leaderboard list" },
  });
  listDuration.add(list.timings.duration);
  check(list, { "leaderboard list returns 200": response => response.status === 200 });

  const detail = http.get(`${baseUrl}/api/v1/leaderboards/${board.id}?${query}`, {
    headers: cookie, tags: { name: "GET leaderboard detail" },
  });
  detailDuration.add(detail.timings.duration);
  check(detail, { "leaderboard detail returns 200": response => response.status === 200 });

  const insights = http.get(`${baseUrl}/api/v1/leaderboards/${board.id}/insights?game=${board.gameSlug}`, {
    headers: cookie, tags: { name: "GET leaderboard insights" },
  });
  insightsDuration.add(insights.timings.duration);
  check(insights, { "leaderboard insights returns 200": response => response.status === 200 });

  sleep(pauseSeconds);
}
