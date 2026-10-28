# Daily Club

Daily Club is a private friends leaderboard for daily games. The first adapter supports [Fermi.gg](https://fermi.gg): players paste a shared result, confirm the parsed score, and compare daily, 7-day, 30-day, and all-time averages.

## Architecture

- Next.js 16 and TypeScript render the web UI.
- Java 21 and Spring Boot 4 provide the REST API, magic-link authentication, authorization, and game logic. A multi-stage Dockerfile packages this service for DigitalOcean.
- PostgreSQL stores accounts, hashed sessions and login tokens, games, immutable scores, and private leaderboards.
- Flyway owns the schema. The database is never exposed directly to browsers.
- Brevo SMTP sends production magic links. Mailpit captures them during local development.

## Local development

Requirements: Node.js 20.19, Java 21, Maven 3.6.3 or newer, and Docker Desktop.

1. Start PostgreSQL and Mailpit:

   ```powershell
   docker compose up -d
   ```

2. In one terminal, start Spring Boot:

   ```powershell
   cd backend
   mvn spring-boot:run
   ```

3. In another terminal, install and start Next.js:

   ```powershell
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000`. Requested sign-in emails appear in Mailpit at `http://localhost:8025`.

The checked-in development defaults match `docker-compose.yml`. Override them with the variables documented in `backend/.env.example` and `.env.example` when necessary. Spring automatically applies Flyway migrations at startup.

## Verification

```powershell
npm run check
cd backend
mvn verify
```

The backend integration test uses a disposable PostgreSQL Testcontainer when Docker is available and skips cleanly when it is not.

## DigitalOcean deployment

The `.do/app.yaml` spec defines two App Platform services under one origin: `/api` routes to Spring Boot and all other paths route to Next.js.

1. Activate transactional email in Brevo and create a verified sender. You can verify an email you already own for initial testing; for reliable production delivery, buy a domain later, authenticate it with Brevo's DKIM and DMARC records, and use a sender such as `login@auth.your-domain.com`.
2. In DigitalOcean, create a managed PostgreSQL 17 cluster named `daily-games-db` in `nyc`. The app spec attaches that existing production cluster by name.
3. Connect DigitalOcean App Platform to the private `nath5763/DailyTracker` GitHub repository and create the app from `.do/app.yaml`.
4. Before the first deployment, replace the placeholder values for `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`, and `AUTH_TOKEN_PEPPER`. `MAIL_FROM` must exactly match a verified Brevo sender. Generate the pepper with a cryptographically secure password generator and keep it stable.
5. Initially test on the assigned `*.ondigitalocean.app` URL. Because `APP_BASE_URL` uses `${APP_URL}`, magic links follow the active primary URL.
6. Attach the purchased domain to the app, make it primary, and verify that `${APP_URL}` changed before requesting a new magic link.
7. Confirm `/api/health`, sign in with two unrelated email addresses, complete both profiles, add one UUID to the other account’s leaderboard, and submit a Fermi score.

App Platform automatically deploys pushes to `main`, provides HTTPS, checks `/api/health`, and alerts on deployment or domain failures. Keep the old Render and Supabase resources until this smoke test passes, then remove them manually to avoid continued billing.

## Security behavior

- Magic links expire after 15 minutes, are single-use, and are stored only as SHA-256 hashes.
- Requests are limited to one link per email per minute, five per email per hour, and twenty per IP per hour.
- Sessions use random opaque tokens, stored as hashes and delivered in 30-day `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- Only users sharing a leaderboard can see one another’s profiles and scores. Only the owner can change membership.
- A user may submit one immutable score per game and puzzle.

## Adding another daily game

Add a game catalog row in a Flyway migration and implement its parser and validation behind the backend game service. Keep common puzzle key, date, and primary score fields in `submissions`; put game-specific details in the JSON `metrics` column.
