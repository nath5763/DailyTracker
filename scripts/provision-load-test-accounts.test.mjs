import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { provisionOne, verificationLink } from "./provision-load-test-accounts.mjs";

function json(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
}

async function fixture({ brokenFirstMessage = false, neverSend = false } = {}) {
  const accounts = new Map();
  let origin;
  const handler = async (request, response) => {
    const url = new URL(request.url, origin);
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    if (url.pathname.startsWith("/mailpit/")) {
      assert.equal(request.headers.authorization, "Basic " + Buffer.from("reader:secret").toString("base64"));
      const email = url.searchParams.get("query")?.match(/to:([^ ]+)/)?.[1];
      const account = accounts.get(email);
      if (url.pathname.endsWith("/search"))
        return json(response, 200, { messages: account?.sent && !neverSend ? [{ ID: email, To: [{ Address: email }] }] : [] });
      const id = decodeURIComponent(url.pathname.split("/").at(-1));
      const found = accounts.get(id);
      return json(response, 200, { HTML: brokenFirstMessage && found.sent === 1
        ? '<a href="https://wrong.example/verify">Bad link</a>'
        : `<a href="${origin}/api/v1/auth/verification/consume?token=${id}">Verify</a>` });
    }
    if (url.pathname === "/api/v1/auth/register") {
      accounts.set(body.email, { sent: 1, onboarded: false });
      return json(response, 202, {});
    }
    if (url.pathname === "/api/v1/auth/verification/resend") {
      accounts.get(body.email).sent++;
      return json(response, 202, {});
    }
    if (url.pathname === "/api/v1/auth/verification/consume") {
      response.writeHead(302, { location: `${origin}/onboarding`, "set-cookie": "daily_tracker_session=test; HttpOnly; Path=/" });
      return response.end();
    }
    if (url.pathname === "/api/v1/me/profile") {
      assert.equal(request.headers.cookie, "daily_tracker_session=test");
      accounts.get(body.displayName.replace(/^Load Tester /, "") === "1" ? [...accounts.keys()][0] : [...accounts.keys()].at(-1)).onboarded = true;
      return json(response, 200, {});
    }
    if (url.pathname === "/api/v1/auth/login") return json(response, 200, { onboarded: accounts.get(body.email)?.onboarded });
    json(response, 404, {});
  };
  const server = createServer(handler);
  const mailpitServer = createServer(handler);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  await new Promise(resolve => mailpitServer.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, mailpitApiUrl: `http://127.0.0.1:${mailpitServer.address().port}/mailpit`, accounts,
    close: () => Promise.all([server, mailpitServer].map(item => new Promise(resolve => item.close(resolve)))) };
}

test("accepts only verification links returning to staging", () => {
  assert.equal(verificationLink('<a href="https://dailytracker.cc/api/v1/auth/verification/consume?token=x">Verify</a>', "https://stage.example"), null);
  assert.equal(verificationLink('<a href="/api/v1/auth/verification/consume?token=x&amp;joinInvite=y">Verify</a>', "https://stage.example"),
    "https://stage.example/api/v1/auth/verification/consume?token=x&joinInvite=y");
});

test("retries a missing link and completes onboarding and login", async () => {
  const app = await fixture({ brokenFirstMessage: true });
  try {
    await provisionOne({ baseUrl: app.origin, mailpitApiUrl: app.mailpitApiUrl,
      email: "one@load-test.invalid", password: "long-enough-password",
      displayName: "Load Tester 1", uiAuth: "reader:secret", retries: 1, retryDelayMs: 0 });
    assert.equal(app.accounts.get("one@load-test.invalid").sent, 2);
    assert.equal(app.accounts.get("one@load-test.invalid").onboarded, true);
  } finally { await app.close(); }
});

test("reports a missing verification email after retry", async () => {
  const app = await fixture({ neverSend: true });
  try {
    await assert.rejects(provisionOne({ baseUrl: app.origin, email: "lost@load-test.invalid",
      password: "long-enough-password", displayName: "Load Tester 1", uiAuth: "reader:secret",
      retries: 1, retryDelayMs: 0, mailTimeoutMs: 1, pollMs: 1 }), /Verification email missing/);
    assert.equal(app.accounts.get("lost@load-test.invalid").sent, 2);
  } finally { await app.close(); }
});

test("provisions more than twenty accounts from one client", async () => {
  const app = await fixture();
  const directory = await mkdtemp(join(tmpdir(), "load-accounts-"));
  const output = join(directory, "accounts.json");
  try {
    const child = spawn(process.execPath, ["scripts/provision-load-test-accounts.mjs"], {
      cwd: process.cwd(), env: { ...process.env, STAGING_BASE_URL: app.origin,
        MAILPIT_API_URL: app.mailpitApiUrl, MAILPIT_UI_AUTH: "reader:secret",
        LOAD_TEST_COUNT: "21", LOAD_TEST_OUTPUT: output }, stdio: ["ignore", "pipe", "pipe"] });
    const stderr = [];
    child.stderr.on("data", chunk => stderr.push(chunk));
    const exitCode = await new Promise(resolve => child.on("exit", resolve));
    assert.equal(exitCode, 0, Buffer.concat(stderr).toString());
    const result = JSON.parse(await readFile(output, "utf8"));
    assert.equal(result.accounts.length, 21);
    assert.equal(result.failures.length, 0);
    assert.equal(new Set(result.accounts.map(account => account.email)).size, 21);
  } finally { await app.close(); await rm(directory, { recursive: true, force: true }); }
});
