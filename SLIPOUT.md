# SlipOut

SlipOut is available at `/daily/slipout`. Run the frontend with `npm run dev` and the sibling Spring Boot backend with its usual database configuration. The frontend's `/api/*` rewrite points to `BACKEND_INTERNAL_URL` (default `http://localhost:8080`). Guests can play without an account; signed-in players get server-verified results on Daily Tracker leaderboards.

## Gameplay

- The board is 6×6. Every block is two or three cells long and moves only along its horizontal or vertical axis.
- Drag a block with a mouse or touch, or focus it and use arrow keys. Home and End move to the farthest available position. Positions snap to cells.
- One continuous slide counts as one move, including a slide across several cells. A release at the original position counts as zero. Sliding back is another move.
- Move the coral target block out of the exit on the right of row three within 90 seconds. The exit movement itself counts as a move.
- The clock uses the start timestamp and current time. A move at or after the 90,000 ms deadline fails; a move before it can complete. Retries are unlimited and reset the board and timer.

## Daily board and optimal moves

Version `v1` freezes eight vetted templates in `lib/slipout/puzzles.ts` and in the backend's `SlipOutPuzzle.java`. The UTC epoch-day modulo eight chooses a template; the puzzle ID is `slipout-v1-YYYY-MM-DD`. The same date and version therefore reproduce the same board on every deployment. The displayed puzzle number counts days from 2026-11-13. Templates cycle after eight days; changing the set or order requires a new version.

`lib/slipout/solver.ts` performs breadth-first search over legal board positions, treating a slide of any distance as one move. Tests validate all eight templates, reject invalid or unsolvable layouts, and confirm their minimum solutions of 8–13 moves. Movement validation is separate from template selection and rendering.

## Results and ranking

Results contain `puzzleId`, `puzzleDate`, `playerId` (null for a guest), `completed`, `moves`, `completionTimeMs` (null on failure), `remainingTimeMs`, and `completedAt`. Completed attempts rank before failures. Among completions, fewer moves rank first; equal move counts are ordered by lower completion time in milliseconds. There is no combined score.

Guest attempt history and the best completed result for each puzzle are stored in `localStorage`. Signed-in attempts use `/api/v1/slipout/today`: `GET` returns today's puzzle and best result, `POST /start` creates a new timed attempt, and `POST /finish` accepts the ordered move log and returns the verified result and current best. The backend replays every move against its daily board and measures time from the server's start and finish timestamps. It rejects illegal movement, collisions, no-ops, and moves after the target has exited. All signed-in attempts are kept in `slipout_attempts`; only the best successful result per player and date is upserted into the existing `submissions` table. Leaderboard metrics are `rankingPrimary = moves` and `rankingSecondary = completionTimeMs`, both ascending, with `completionStatus = WIN`.

The share text uses the active site's origin, the daily puzzle number, move count, completion time, and optimal move count. Native sharing is used when available, with a separate copy button.

## Verification

Run `npm run test` and `npm run build` in the frontend. Run `mvn -Dtest=SlipOutPuzzleTest test` in the backend. The `slipOutRetriesKeepOnlyTheVerifiedBestCompletion` integration test exercises persistence and best-result replacement when Docker/Testcontainers is available. Deployment requires PostgreSQL and the Flyway migration `V36__slipout.sql`.
