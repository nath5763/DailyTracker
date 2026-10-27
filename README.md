# Daily Club

A private leaderboard for the daily games friends play together. The first game adapter supports [Fermi.gg](https://fermi.gg): paste its shared result, confirm the parsed puzzle and score, and compare daily, 7-day, 30-day, and all-time results.

## Stack

- Next.js App Router and TypeScript
- Supabase passwordless authentication and PostgreSQL with row-level security
- Render web-service deployment
- Vitest for parser and leaderboard logic

## Local setup

1. Install Node.js 20 and dependencies with `npm install`.
2. Create a Supabase project and install the Supabase CLI if you want a local database.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
4. Apply `supabase/migrations/202610270001_initial_schema.sql` through the Supabase SQL editor, or run `supabase db push` after linking the project.
5. In Supabase Authentication URL Configuration, set the site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL.
6. Run `npm run dev` and open `http://localhost:3000`.

Without environment variables, the public landing and sign-in setup notice still render. Authenticated features require Supabase.

## Data and privacy behavior

- Onboarding creates a profile, permanent public UUID, and a private “My Friends” leaderboard.
- Only people sharing a leaderboard can read one another’s profiles and submissions.
- Only a leaderboard owner can add or remove members. Adding is immediate and uses an exact UUID.
- A user may submit exactly one result per game and puzzle. Normal users receive no update or delete permission for submissions.
- Deleting an authentication account cascades its profile, submissions, and owned leaderboards.
- Scores are self-reported. The app validates share-text structure but does not verify results with game publishers.

## Adding another daily game

Implement the `GameAdapter` interface in `lib/games`, register the adapter in `lib/games/index.ts`, and add a `games` catalog row in a new migration. Game-specific details remain in the submission `metrics` JSON while the common puzzle key, date, and primary score continue to power history and leaderboards.

## Verification

Run the complete local suite with:

```sh
npm run check
```

## Render deployment

1. Push the repository to GitHub and create a Render Blueprint from `render.yaml`.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` in Render. Set the site URL to the final `https://…onrender.com` origin.
3. Add that origin and `/auth/callback` URL to Supabase Authentication URL Configuration.
4. Apply database migrations before deploying application code that depends on them.
5. Verify `/api/health`, request a real magic link, complete onboarding, and submit a Fermi result.

Supabase credentials are never committed. The public anon key is intentionally browser-safe; authorization is enforced by database policies.
