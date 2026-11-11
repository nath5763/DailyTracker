import { randomBytes } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { provisionOne } from "./provision-load-test-accounts.mjs";

const sourcePath = process.env.LOAD_TEST_SOURCE ?? ".load-test-accounts-25.json";
const outputPath = process.env.LOAD_TEST_OUTPUT ?? ".load-test-accounts-1000.json";
const targetCount = Number(process.env.LOAD_TEST_COUNT ?? "1000");
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? "4");
const mailpitApiUrl = process.env.MAILPIT_API_URL?.replace(/\/$/, "");
const uiAuth = process.env.MAILPIT_UI_AUTH;
const domain = process.env.LOAD_TEST_EMAIL_DOMAIN ?? "load-test.invalid";

async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }

function validateSource(source) {
  const url = new URL(source.baseUrl);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.hostname === "dailytracker.cc" ||
      url.hostname === "www.dailytracker.cc") throw new Error("The source file must point to the HTTPS staging origin.");
  if (!Array.isArray(source.accounts) || !source.accounts.length || source.failures?.length)
    throw new Error("The source account file must contain successful accounts only.");
  if (new Set(source.accounts.map(account => account.email)).size !== source.accounts.length)
    throw new Error("The source account file contains duplicate emails.");
}

async function preflight(baseUrl) {
  if (!mailpitApiUrl || new URL(mailpitApiUrl).pathname !== "/mailpit" || !uiAuth?.includes(":"))
    throw new Error("Set MAILPIT_API_URL and MAILPIT_UI_AUTH for the running Mailpit tunnel.");
  const headers = { Authorization: `Basic ${Buffer.from(uiAuth).toString("base64")}` };
  const [health, mailpit] = await Promise.all([
    fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(15_000) }),
    fetch(`${mailpitApiUrl}/api/v1/messages`, { headers, signal: AbortSignal.timeout(15_000) }),
  ]);
  if (!health.ok || !mailpit.ok)
    throw new Error(`Staging health=${health.status}, Mailpit read API=${mailpit.status}; fix before provisioning.`);
}

async function main() {
  if (!Number.isSafeInteger(targetCount) || targetCount < 1 ||
      !Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 16)
    throw new Error("LOAD_TEST_COUNT must be positive and LOAD_TEST_CONCURRENCY must be 1–16.");
  if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error("LOAD_TEST_EMAIL_DOMAIN is invalid.");
  if (sourcePath === outputPath) throw new Error("LOAD_TEST_SOURCE and LOAD_TEST_OUTPUT must differ.");
  const source = await readJson(sourcePath);
  validateSource(source);
  if (targetCount < source.accounts.length) throw new Error("LOAD_TEST_COUNT is smaller than the source account count.");
  await preflight(source.baseUrl);

  let state;
  try {
    state = await readJson(outputPath);
    if (state.baseUrl !== source.baseUrl || state.targetCount !== targetCount ||
        state.sourceCount !== source.accounts.length || !state.runId || !state.batchPassword)
      throw new Error("Existing output does not match this provisioning run.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    state = {
      baseUrl: source.baseUrl, targetCount, sourceCount: source.accounts.length,
      runId: `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`,
      batchPassword: randomBytes(24).toString("base64url"),
      accounts: source.accounts, failures: [],
    };
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

  const ready = new Set(state.accounts.map(account => account.email));
  const remaining = targetCount - state.sourceCount;
  let next = 1;
  let completedThisRun = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index > remaining) return;
      const email = `load-${state.runId}-${index}@${domain}`;
      if (ready.has(email)) continue;
      try {
        await provisionOne({ baseUrl: state.baseUrl, mailpitApiUrl, uiAuth, email,
          password: state.batchPassword, displayName: `Load Tester ${state.sourceCount + index}` });
        state.accounts.push({ email, password: state.batchPassword });
        state.failures = state.failures.filter(failure => failure.email !== email);
        ready.add(email);
        completedThisRun++;
        await save();
        if (state.accounts.length % 25 === 0 || state.accounts.length === targetCount)
          process.stdout.write(`Ready ${state.accounts.length}/${targetCount}\n`);
      } catch (error) {
        state.failures = state.failures.filter(failure => failure.email !== email);
        state.failures.push({ email, error: error.message });
        await save();
        process.stderr.write(`Failed ${email}: ${error.message}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  process.stdout.write(`Saved ${state.accounts.length}/${targetCount} accounts, ${state.failures.length} failures `
    + `(${completedThisRun} created this run) to ${outputPath}\n`);
  if (state.accounts.length !== targetCount || state.failures.length) process.exitCode = 1;
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
