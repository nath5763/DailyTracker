# Load-test handoff — 2026-11-11

## Latest staging state — 2026-11-11

- The separate staging app now has 1,000 verified test accounts and 50 single-game leaderboards with exactly 20 members each, covering ten games. All 1,000 accounts have dated scores. The current fixture is `.load-test-fixture-20.json`.
- The 24 earlier 50- or 250-member boards and four boards from the 25-user pilot fixture were deleted through the backend API. The cleanup script verified all 50 replacement rosters before deletion, confirmed the old board IDs return 404, and sampled users across the batch see only their new board. The first board's HTML, detail, and insights endpoints returned 200.
- Staging health returned 200. The active DigitalOcean deployment includes backend commit `97c7b5e` (batched leaderboard member profile loading).
- The 1,000-user k6 run has **not** been started. The user will start it with: `k6 run --summary-export k6-leaderboards-1000.json -e FIXTURE_FILE=../.load-test-fixture-20.json -e TARGET_VUS=1000 scripts/k6-leaderboards.js` from `D:\IdeaProjects\DailyGames`.
- Main-branch follow-up: enforce a 20-member maximum in the backend's direct add and invitation paths. The test branch currently has no server-side cap.

The sections below describe earlier checkpoints and are retained for history.

## Live DigitalOcean app

- App: `load-test` (`0954754d-5a46-4982-9355-c48c7aea7e3f`), https://load-test-atbh8.ondigitalocean.app
- Active deployment at handoff: `da7f6298-4c54-46ed-9620-909e084b073b`.
- UI (`dailytracker`) and backend (`dailytrackerbackend`) both deploy from their pushed `load-testing` branches. The backend had mistakenly pointed to `master`, causing `BREVO_API_KEY must be configured`; this was corrected and the backend starts with `EMAIL_PROVIDER=mailpit`.
- `/api` now routes to the backend with its prefix preserved. `/api/health` and `/api/v1/catalog/games` returned 200. The frontend has `BACKEND_INTERNAL_URL=http://dailytrackerbackend` for server-side API calls.
- App database component: `db-pgsql-nyc3-69235-load`, a separate PostgreSQL cluster from production. The load-test and production apps each currently have two 1-vCPU/1-GB UI instances and two 1-vCPU/1-GB backend instances; both database clusters are 1-vCPU/1-GB, one node.
- Mailpit is running on the local computer behind a Cloudflare quick tunnel, not as a component of this live app. The backend's `MAILPIT_API_URL` points to that tunnel plus `/mailpit`. The tunnel and Docker container must stay running while provisioning accounts. The tunnel hostname can change on restart; update the backend variable and local provisioning command if it does. The protected Mailpit read API returned 200 with the configured reader credentials. Credentials are intentionally omitted here.

## Local files and verification

- Frontend repo: `D:\IdeaProjects\DailyGames`, branch `load-testing`. Backend repo: `D:\IdeaProjects\DailyGamesBackend`, branch `load-testing` and clean at handoff.
- New local script: `scripts/k6-signed-in.js`. It logs in once per VU, then reads dashboard, leaderboards, and games APIs. `MODE=pages` reads the Next.js dashboard and leaderboards pages instead. It requires one provisioned account per VU and refuses a production account file. It now reports separate `api_*_duration` and `page_*_duration` metrics for each tested endpoint; a one-user, 8-second API check showed those metrics and 0 failed requests.
- Updated local account setup script: `scripts/provision-load-test-accounts.mjs` accepts `MAILPIT_API_URL` separately from `STAGING_BASE_URL`, for the current tunnel setup. Its tests passed (4/4); changed scripts passed ESLint.
- A one-account end-to-end smoke test passed: registration, Mailpit message lookup, staging verification link, onboarding, and login.
- A 25-account batch passed from one setup machine: 25 ready, 0 failures. Local ignored credentials file: `.load-test-accounts-25.json`. A separate one-account smoke file is `.load-test-accounts.json`. These files contain passwords; keep them private and do not commit them.
- A 1-VU, 15-second API smoke test passed (0/19 failed HTTP requests). A 1-VU page smoke test passed (0/13 failed). A 5-VU, 30-second API baseline passed: 185 HTTP requests, 0 failures, p95 310 ms. These are smoke results, not a capacity limit.
- User-reported 10-VU API run (about 2 minutes): 1,450 HTTP requests, 0 failures, 480 iterations, 11.71 requests/second, overall p95 252.62 ms. Per-endpoint p95: dashboard 284.77 ms, games 247.98 ms, leaderboards 217.05 ms. All 1,440 endpoint checks passed. The 2-second pause and sequential reads limit throughput, so this does not establish maximum capacity. DigitalOcean service and database metrics were not included with the result.
- Uncommitted frontend changes at handoff: `.do/load-testing.yaml` (the earlier cluster-name edit), `README.md`, `scripts/provision-load-test-accounts.mjs`, `scripts/provision-load-test-accounts.test.mjs`, and new `scripts/k6-signed-in.js`. None of these local changes was pushed in this session. The live app was updated directly through DigitalOcean. The local `.do/load-testing.yaml` describes a different setup with an App Platform Mailpit component, so do not apply it to the current live app without reconciling the spec.

## Next k6 runs

From PowerShell in `D:\IdeaProjects\DailyGames`:

```powershell
k6 run -e ACCOUNTS_FILE=../.load-test-accounts-25.json -e VUS=10 -e DURATION=2m scripts/k6-signed-in.js
k6 run -e ACCOUNTS_FILE=../.load-test-accounts-25.json -e VUS=25 -e DURATION=5m scripts/k6-signed-in.js
k6 run -e ACCOUNTS_FILE=../.load-test-accounts-25.json -e VUS=10 -e DURATION=2m -e MODE=pages scripts/k6-signed-in.js
```

Watch frontend/backend CPU, memory, error rate and latency, plus database CPU and connection count, at each level. Record requests per second and p95 latency. The current accounts have no boards or scores, so these runs mostly exercise empty data reads. Seed representative boards, memberships, and scores before interpreting results as production capacity. Account registration throughput should be tested separately from signed-in usage.

For diagnosis, open the load-test app's DigitalOcean **Insights** tab and select each service separately. Open the separate PostgreSQL cluster's **Insights** tab for CPU, memory, connections, cache hit ratio, scans, throughput, and deadlocks. The backend has Spring Boot Actuator installed, but its current configuration exposes only health; deeper JVM, request, and Hikari connection metrics require a protected metrics endpoint or a monitoring exporter. The Hikari pool limit is currently five connections per backend instance. Use PostgreSQL `pg_stat_statements` if available to rank SQL by total and mean execution time, then `EXPLAIN (ANALYZE, BUFFERS)` on slow read queries.
