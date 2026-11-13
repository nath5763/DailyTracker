# SlipOut

SlipOut is available at `/daily/slipout`. Run the frontend with `npm run dev` and the sibling Spring Boot backend with its usual database configuration. The frontend's `/api/*` rewrite points to `BACKEND_INTERNAL_URL` (default `http://localhost:8080`). Guests can play without an account; signed-in players get server-verified results on Daily Tracker leaderboards.

## Levels

The separate `/daily/slipout/levels` mode has 15 fixed levels: five easy (6–12 optimal moves), five medium (13–19), and five hard (20 or more). Levels unlock in order and completed levels remain replayable. Daily results do not unlock levels. Level targets are 1×1, 1×2, or 2×1. A 2×1 target starts on the horizontal axis; a 1×2 target starts on the vertical axis; each 1×1 level declares its starting axis. The target keeps its shape and can only slide along its active axis. Landing on a switch cell with newly occupied target space toggles the axis once; passing over a switch or staying on it does not. Other blocks may cross switches without changing them.

Each level has one one-cell-wide exit on a specified side and cell. The target can leave only along its active axis, aligned with the opening, with its one-cell-wide end facing out. Other blocks remain two- or three-cell bars moving on one axis. `lib/slipout/level-engine.ts` uses breadth-first search over block positions and active axis to verify the exact optimal move count.

Guest best moves and their verified move histories are saved on this device. Signed-in best moves and unlocks are saved through `/api/v1/slipout/levels`; guest completions are imported after sign-in and replayed by the server before they count. There is no public level leaderboard. The level catalog is frozen as `slipout-level-v2-01` through `slipout-level-v2-15` in both repositories. Database migration `V40__reset_slipout_level_catalog.sql` clears old level attempts and progress. The frontend clears the old `slipout:levels:v1` guest key and stores version 2 progress separately. Daily results and rankings are unaffected.

## Daily gameplay

- The board is 6×6. Every block is two or three cells long and moves only along its horizontal or vertical axis.
- Drag a block with a mouse or touch, or focus it and use arrow keys. Home and End move to the farthest available position. Positions snap to cells.
- One continuous slide counts as one move, including a slide across several cells. A release at the original position counts as zero. Sliding back is another move.
- Start reveals the blocks. Guide the pink target out of the exit on the right of row three. The exit movement itself counts as a move.
- There is no time limit. Retries are unlimited; restarting ends the current attempt and resets the board.

## Daily board and optimal moves

Version `v1` freezes eight vetted templates in `lib/slipout/puzzles.ts` and in the backend's `SlipOutPuzzle.java`. The UTC epoch-day modulo eight chooses a template; the puzzle ID is `slipout-v1-YYYY-MM-DD`. The same date and version therefore reproduce the same board on every deployment. The displayed puzzle number counts days from 2026-11-13. Templates cycle after eight days; changing the set or order requires a new version.

`lib/slipout/solver.ts` performs breadth-first search over legal board positions, treating a slide of any distance as one move. Tests validate all eight templates, reject invalid or unsolvable layouts, and confirm their minimum solutions of 8–13 moves. Movement validation is separate from template selection and rendering.

## Results and ranking

Results contain `puzzleId`, `puzzleDate`, `playerId` (null for a guest), `completed`, `moves`, and `completedAt`. Completed attempts rank before restarted attempts. Among completions, fewer moves rank first; equal move counts share a rank.

Guest attempt history and the best completed result for each puzzle are stored in `localStorage`. Signed-in attempts use `/api/v1/slipout/today`: `GET` returns today's puzzle and best result, `POST /start` creates a new attempt, and `POST /finish` accepts the ordered move log and returns the verified result and current best. The backend replays every move against its daily board. It rejects illegal movement, collisions, no-ops, and moves after the target has exited. All signed-in attempts are kept in `slipout_attempts`; only the best successful result per player and date is upserted into the existing `submissions` table. Leaderboard metrics are `rankingPrimary = moves`, ascending, with `completionStatus = WIN`. The old attempt time columns remain for database compatibility.

The Share results button copies text containing the active site's origin, the daily puzzle number, move count, and optimal move count.

## Verification

Run `npm run typecheck`, `npm run test`, and `npm run build` in the frontend, and `mvn test` in the backend. The `slipOutRetriesKeepOnlyTheVerifiedBestCompletion` integration test exercises persistence and best-result selection when Docker/Testcontainers is available. Deployment requires PostgreSQL and Flyway migration `V38__slipout_untimed_moves_only.sql` to update historical submissions.
