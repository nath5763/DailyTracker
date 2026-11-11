import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const durationByPath = {
  "/api/v1/dashboard": new Trend("api_dashboard_duration", true),
  "/api/v1/leaderboards": new Trend("api_leaderboards_duration", true),
  "/api/v1/games": new Trend("api_games_duration", true),
  "/dashboard": new Trend("page_dashboard_duration", true),
  "/leaderboards": new Trend("page_leaderboards_duration", true),
};

const fixture = JSON.parse(open(__ENV.ACCOUNTS_FILE || "../.load-test-accounts.json"));
const baseUrl = fixture.baseUrl?.replace(/\/$/, "");
const mode = __ENV.MODE || "api";
const pauseSeconds = Number(__ENV.PAUSE_SECONDS || "2");

if (!baseUrl?.startsWith("https://") || /https:\/\/(?:www\.)?dailytracker\.cc(?:\/|$)/i.test(baseUrl))
  throw new Error("Accounts file must point to the HTTPS load-testing app, not production.");
if (!Array.isArray(fixture.accounts) || fixture.accounts.length === 0 || fixture.failures?.length)
  throw new Error("Provision accounts successfully before running k6.");
if (!["api", "pages"].includes(mode)) throw new Error("MODE must be api or pages.");
if (!Number.isFinite(pauseSeconds) || pauseSeconds < 0) throw new Error("PAUSE_SECONDS must be nonnegative.");

export const options = {
  vus: Number(__ENV.VUS || "5"),
  duration: __ENV.DURATION || "2m",
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
  },
};

if (!Number.isSafeInteger(options.vus) || options.vus < 1 || options.vus > fixture.accounts.length)
  throw new Error("VUS must be between 1 and the number of provisioned accounts.");

export function setup() {
  const sessions = [];
  for (const account of fixture.accounts.slice(0, options.vus)) {
    const response = http.post(`${baseUrl}/api/v1/auth/login`, JSON.stringify(account), {
      headers: { "Content-Type": "application/json" }, tags: { name: "POST /api/v1/auth/login (setup)" },
    });
    const session = response.cookies.daily_tracker_session?.[0]?.value;
    if (response.status !== 200 || !session)
      throw new Error(`Account login failed during setup: HTTP ${response.status}`);
    sessions.push(`daily_tracker_session=${session}`);
  }
  return sessions;
}

export default function signedInSession(sessions) {
  const cookie = sessions[(__VU - 1) % sessions.length];
  const paths = mode === "pages"
    ? ["/dashboard", "/leaderboards"]
    : ["/api/v1/dashboard", "/api/v1/leaderboards", "/api/v1/games"];
  for (const path of paths) {
    const response = http.get(`${baseUrl}${path}`, {
      headers: { Cookie: cookie }, tags: { name: `GET ${path}` },
    });
    durationByPath[path].add(response.timings.duration);
    check(response, { [`${path} returns 200`]: result => result.status === 200 });
  }
  sleep(pauseSeconds);
}
