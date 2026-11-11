import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const verificationPath = "/api/v1/auth/verification/consume";

export function verificationLink(html, baseUrl) {
  const origin = new URL(baseUrl).origin;
  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const candidate = new URL(match[1].replaceAll("&amp;", "&"), origin);
      if (candidate.origin === origin && candidate.pathname === verificationPath && candidate.searchParams.has("token"))
        return candidate.toString();
    } catch { /* Ignore malformed links in the message. */ }
  }
  return null;
}

async function request(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), ...options });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`${response.status} ${error.code ?? error.error ?? response.statusText}`);
  }
  return response;
}

async function postJson(url, data, cookie) {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(data),
  });
}

async function findEmail(mailpitApiUrl, email, uiAuth, timeoutMs, pollMs) {
  const deadline = Date.now() + timeoutMs;
  const headers = { Authorization: `Basic ${Buffer.from(uiAuth).toString("base64")}` };
  const query = new URLSearchParams({ query: `to:${email} tag:email-verification`, limit: "10" });
  do {
    const result = await request(`${mailpitApiUrl}/api/v1/search?${query}`, { headers }).then(response => response.json());
    const message = result.messages?.find(item => item.To?.some(to => to.Address?.toLowerCase() === email));
    if (message) {
      const full = await request(`${mailpitApiUrl}/api/v1/message/${encodeURIComponent(message.ID)}`, { headers });
      return full.json();
    }
    await pause(pollMs);
  } while (Date.now() < deadline);
  return null;
}

export async function provisionOne({ baseUrl, mailpitApiUrl = `${baseUrl}/mailpit`, email, password, displayName, uiAuth, mailTimeoutMs = 30_000,
  pollMs = 1_000, retries = 2, retryDelayMs = 65_000 }) {
  await postJson(`${baseUrl}/api/v1/auth/register`, { email, password });
  let link;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const message = await findEmail(mailpitApiUrl, email, uiAuth, mailTimeoutMs, pollMs);
    link = message?.HTML ? verificationLink(message.HTML, baseUrl) : null;
    if (link) break;
    if (attempt === retries) throw new Error(message ? "Verification link missing from email" : "Verification email missing");
    await pause(retryDelayMs);
    await postJson(`${baseUrl}/api/v1/auth/verification/resend`, { email });
  }

  const verified = await fetch(link, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
  const location = verified.headers.get("location");
  const cookie = verified.headers.get("set-cookie")?.split(";", 1)[0];
  if (verified.status !== 302 || !cookie || !location || new URL(location).origin !== new URL(baseUrl).origin ||
      !new URL(location).pathname.startsWith("/onboarding")) throw new Error("Verification did not redirect to staging onboarding");

  await request(`${baseUrl}/api/v1/me/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ displayName, avatarColor: "#dfff4f" }),
  });
  const login = await postJson(`${baseUrl}/api/v1/auth/login`, { email, password }).then(response => response.json());
  if (!login.onboarded) throw new Error("Login succeeded without completed onboarding");
}

async function main() {
  const baseUrl = process.env.STAGING_BASE_URL?.replace(/\/$/, "");
  const mailpitApiUrl = (process.env.MAILPIT_API_URL ?? `${baseUrl}/mailpit`).replace(/\/$/, "");
  const uiAuth = process.env.MAILPIT_UI_AUTH;
  const count = Number(process.env.LOAD_TEST_COUNT ?? "1");
  const domain = process.env.LOAD_TEST_EMAIL_DOMAIN ?? "load-test.invalid";
  const password = process.env.LOAD_TEST_PASSWORD ?? randomBytes(24).toString("base64url");
  const output = process.env.LOAD_TEST_OUTPUT ?? ".load-test-accounts.json";
  if (!baseUrl || !/^https?:\/\//.test(baseUrl) || new URL(baseUrl).pathname !== "/")
    throw new Error("Set STAGING_BASE_URL to the staging origin, without a path.");
  if (new URL(baseUrl).hostname === "dailytracker.cc" || new URL(baseUrl).hostname === "www.dailytracker.cc")
    throw new Error("Production domain refused.");
  if (!/^https?:\/\//.test(mailpitApiUrl) || new URL(mailpitApiUrl).pathname !== "/mailpit")
    throw new Error("Set MAILPIT_API_URL to the Mailpit origin plus /mailpit.");
  if (!uiAuth?.includes(":")) throw new Error("Set MAILPIT_UI_AUTH to the staging Mailpit reader username:password.");
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("LOAD_TEST_COUNT must be a positive integer.");
  if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error("LOAD_TEST_EMAIL_DOMAIN is invalid.");
  const runId = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const accounts = [];
  const failures = [];
  for (let index = 1; index <= count; index++) {
    const email = `load-${runId}-${index}@${domain}`;
    try {
      await provisionOne({ baseUrl, mailpitApiUrl, email, password, displayName: `Load Tester ${index}`, uiAuth });
      accounts.push({ email, password });
      process.stdout.write(`Ready ${index}/${count}: ${email}\n`);
    } catch (error) {
      failures.push({ email, error: error.message });
      process.stderr.write(`Failed ${index}/${count}: ${email}: ${error.message}\n`);
    }
  }
  await writeFile(output, JSON.stringify({ baseUrl, accounts, failures }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  process.stdout.write(`Saved ${accounts.length} accounts and ${failures.length} failures to ${output}\n`);
  if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
