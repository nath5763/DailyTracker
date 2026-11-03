# Daily Club

Daily Club is a private friends leaderboard for daily games. Game adapters support [Fermi.gg](https://fermi.gg) and [Krillion](https://krillion.io): players paste a shared result, confirm the parsed score, and compare daily, 7-day, 30-day, and all-time averages.

## Architecture

- Next.js 16 and TypeScript render the web UI.
- The sibling `DailyGamesBackend` repository contains the Java 21 and Spring Boot 4 REST API, authentication, authorization, game logic, and production Dockerfile.
- PostgreSQL stores accounts, adaptive password hashes, hashed sessions and one-time action tokens, games, immutable scores, and private leaderboards.
- Flyway owns the schema. The database is never exposed directly to browsers.
- Brevo's HTTPS transactional email API sends verification and password-reset messages without requiring SMTP access.

## Local development

Requirements for the complete stack: Node.js 20.19, Java 21, Maven 3.6.3 or newer, Docker Desktop, and sibling checkouts named `DailyGames` and `DailyGamesBackend`.

1. Start PostgreSQL:

   ```powershell
   cd ..\DailyGamesBackend
   docker compose up -d
   ```

2. In one terminal, start Spring Boot:

   ```powershell
   cd ..\DailyGamesBackend
   mvn spring-boot:run
   ```

3. In another terminal, install and start Next.js:

   ```powershell
   npm install
   npm run dev
   ```

4. Set `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` for the backend, then open `http://localhost:3000`. Verification and password-reset emails are sent through Brevo.

The backend repository's development defaults match its `docker-compose.yml`. Override them with the variables documented in `DailyGamesBackend/.env.example` and this repository's `.env.example` when necessary. Spring automatically applies Flyway migrations at startup.

## Verification

```powershell
npm run check
cd ..\DailyGamesBackend
mvn verify
```

The backend integration test uses a disposable PostgreSQL Testcontainer when Docker is available and skips cleanly when it is not.

## DigitalOcean deployment

The `.do/app.yaml` spec defines two App Platform services under one origin: `/api` routes to Spring Boot and all other paths route to Next.js.

1. Activate transactional email in Brevo and create a verified sender. You can verify an email you already own for initial testing; for reliable production delivery, buy a domain later, authenticate it with Brevo's DKIM and DMARC records, and use a sender such as `login@auth.your-domain.com`.
2. In DigitalOcean, create a managed PostgreSQL 17 cluster named `daily-games-db` in `nyc`. The app spec attaches that existing production cluster by name.
3. Create the private `nath5763/DailyGamesBackend` repository and push the sibling backend checkout to it. Then give DigitalOcean access to both `nath5763/DailyTracker` and `nath5763/DailyGamesBackend` and create the app from `.do/app.yaml`.
4. Before the first deployment, replace the placeholder values for `BREVO_API_KEY` and `AUTH_TOKEN_PEPPER`. `BREVO_API_KEY` must be an API key, not an SMTP key, and `BREVO_SENDER_EMAIL` must exactly match a verified Brevo sender. Generate the pepper with a cryptographically secure password generator and keep it stable.
5. Initially test on the assigned `*.ondigitalocean.app` URL. Because `APP_BASE_URL` uses `${APP_URL}`, verification and reset links follow the active primary URL.
6. Attach the purchased domain to the app, make it primary, and verify that `${APP_URL}` changed before requesting new account emails.
7. Confirm `/api/health`, sign in with two unrelated email addresses, complete both profiles, add one UUID to the other account’s leaderboard, and submit a score for each supported game.

App Platform automatically deploys pushes to `main`, provides HTTPS, checks `/api/health`, and alerts on deployment or domain failures. Keep the old Render and Supabase resources until this smoke test passes, then remove them manually to avoid continued billing.

## Google AdSense

The root layout loads the AdSense Auto ads script for publisher `ca-pub-7254167041351258` on every document. Authorized seller information is published at `/ads.txt`. Auto ads are intended for `/`, `/dashboard`, `/submit`, and individual `/leaderboards/{id}` pages; route and area exclusions are configured in AdSense rather than in application code.

After deploying to the production domain:

1. Add and verify the production domain in AdSense, enable Auto ads, and confirm that `https://<production-domain>/ads.txt` returns HTTP 200 with exactly `google.com, pub-7254167041351258, DIRECT, f08c47fec0942fa0`.
2. Under Auto ads page exclusions, exclude `/auth`, `/onboarding`, and `/profile` with **all pages under this section**. Exclude `/leaderboards` and `/privacy` as **this page only**, so individual `/leaderboards/{id}` pages remain eligible.
3. In the Auto ads preview, exclude the protected elements `#account-uuid`, `#leaderboard-roster-management`, `#leaderboard-roster-copy`, and `#locked-board-billing-controls` from in-page placements. Check both desktop and mobile previews.
4. Under **Privacy & messaging**, configure Google's certified consent-management platform for visitors in the EEA, United Kingdom, and Switzerland, and configure the applicable US-state privacy messages.
5. Preview included and excluded routes, including client-side navigation between them, then request the AdSense site review. Confirm that ads can appear only on eligible routes and never within the protected management elements.

The public `/privacy` page documents authentication, profile, score, leaderboard, email, billing, hosting, and advertising data practices. Keep it synchronized with the production service and provider configuration. This setup guidance is operational, not legal advice.

## Security behavior

- Email-verification links expire after 24 hours and password-reset links after 30 minutes; both are single-use and stored only as SHA-256 hashes.
- Passwords are stored with Spring Security's adaptive `DelegatingPasswordEncoder`, and login and account-email requests are rate limited.
- Sessions use random opaque tokens, stored as hashes and delivered in 30-day `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- Only users sharing a leaderboard can see one another’s profiles and scores. Only the owner can change membership.
- A user may submit one immutable score per game and puzzle.

## Adding another daily game

Add a game catalog row in a Flyway migration and implement the backend `GameAdapter` contract. The adapter supplies final validation, score formatting, and form metadata. Add the matching browser preview parser in `lib/preview-score.ts` so preview remains local; the backend validates the result again when it is saved. Keep common puzzle key, date, and primary score fields in `submissions`; put game-specific details in the JSON `metrics` column.

Deploy the backend adapter and API changes before the frontend preview parser. The frontend discovers the game catalog and presentation from `/api/v1/games` when the authenticated layout first loads.
