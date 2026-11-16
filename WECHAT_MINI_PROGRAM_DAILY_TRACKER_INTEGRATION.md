# Daily Tracker — WeChat Mini Program Group Integration

**Status:** Implementation specification / Codex handoff  
**Priority:** Phase 1 (standard Mini Program sharing); Phase 2 (optional Chat Tool Mode)  
**Last reviewed:** November 12, 2026

## 1. Objective

Allow a group of friends who already use a **regular WeChat group chat** to create or join a Daily Tracker leaderboard without needing a Discord or Telegram bot.

A member should be able to share a Daily Tracker Mini Program card into their group. Other group members can open it, link or create a Daily Tracker account, submit daily-game results, and view the shared leaderboard inside the Mini Program. Scores, game definitions, players, and ranking logic remain owned by the existing Daily Tracker backend.

**Important product boundary:** A standard WeChat Mini Program **cannot read all messages in a regular WeChat group or intercept pasted game results in the conversation**. The user must open the Mini Program and submit a result there. This is not a drop-in replacement for Discord slash commands or Telegram bots.

## 2. Scope and rollout

### Phase 1 — Deliverable (no Chat Tool approval assumed)

- WeChat Mini Program frontend, optimized for mobile.
- WeChat login and account linking to an existing Daily Tracker player.
- Create a group-associated leaderboard or join one from a group-shared card.
- Resolve a **verified** WeChat group context when available; map it to an existing Daily Tracker `leaderboardId`.
- Fallback to an invite token when group context is unavailable or cannot be resolved.
- Paste daily game output; submit to the existing parsing/scoring API.
- Display supported games, today's submissions, standings, and player history.
- Share a Mini Program leaderboard card back to a WeChat group **through a user-initiated sharing action**.
- Unlink a WeChat identity and administratively disconnect a WeChat group mapping.
- Feature flags, logging, failure handling, and tests.

### Phase 2 — Optional, explicitly gated

Investigate WeChat **Chat Tool Mode (聊天工具模式)**, which was introduced as a developer beta. Its approval, platform restrictions, client support, and current availability **must be confirmed in the WeChat developer console** before treating any feature as deliverable.

Potential enhancements if supported:

- Launch the leaderboard from a chat-tool context.
- Resolve the active chat/group context using the approved Chat Tool API.
- Select or remind group members through platform-controlled flows.
- Share interactive/updated activity cards to the chat.
- Update a platform-supported dynamic card after score changes, using the documented server-side API where authorized.

**Do not build Phase 1 around Phase 2 APIs or promise unattended bot-like posting.**

## 3. User journeys

### 3.1 Create and link a leaderboard to a WeChat group

1. A WeChat user opens the Daily Tracker Mini Program.
2. They sign in with WeChat and optionally link an existing Daily Tracker account.
3. They create a leaderboard or choose one they own/manage.
4. The app generates a short-lived, scoped invite/share reference for that leaderboard.
5. The user shares a Mini Program card into an existing WeChat group.
6. A member opens the card from that group. The Mini Program attempts to obtain **group launch context** using supported WeChat APIs (see section 5).
7. If the group identifier can be securely decrypted and verified, the backend checks whether that group is already mapped:
   - **Unmapped:** show a confirmation screen requesting explicit association with the intended leaderboard; enforce the application's authorization/linking policy.
   - **Mapped to the same leaderboard:** show the leaderboard.
   - **Mapped to a different leaderboard:** do not silently overwrite it; show the existing association or a conflict flow.
8. The app displays the group's leaderboard and a **Submit score** action.

Do not infer that the creator is a WeChat group administrator: ordinary group context alone is **not proof of administrative authority**. Use Daily Tracker ownership, explicit group-link confirmation, and conflict/transfer controls.

### 3.2 Join from a shared leaderboard card

1. Player taps a card in a WeChat group.
2. Mini Program validates the card's opaque, expiring share reference server-side.
3. App authenticates the user using `wx.login` and the backend's WeChat session exchange.
4. App resolves group context if the launch scene supports it.
5. App presents the correct leaderboard. If no verified group context exists, it may use the invite to reach the leaderboard, but **must not claim that the current WeChat group was verified**.
6. Player accepts the invitation; create a membership following existing Daily Tracker rules.
7. Player can see the scoreboard and submit scores.

### 3.3 Submit a daily-game score

1. Player chooses a game (prefer quick picks for the few games played by this group).
2. Player pastes the game's share text into an input field.
3. Mini Program calls the existing Daily Tracker parsing/submission endpoint through an authenticated adapter.
4. Backend validates game type, player, leaderboard membership, date/day rules, and duplicate policy.
5. Backend returns the parsed score and ranking changes.
6. UI displays confirmation, today's standings, and a **Share result** action.
7. Sharing is user initiated; do not assume that backend callbacks can inject ordinary chat messages.

### 3.4 Unlink or remove

- User can disconnect their WeChat account from their Daily Tracker account.
- Authorized Daily Tracker leaderboard owner/admin can disconnect or transfer a WeChat group mapping with confirmation and audit logging.
- Disconnecting must not delete historical scores unless separately requested under existing account/data rules.
- Revocation invalidates associated authentication sessions/links where appropriate.

## 4. UX requirements

**Mini Program screens**

1. **Welcome / Login:** WeChat login; link existing Daily Tracker profile by one-time website-generated code (preferred) or a secure equivalent already implemented in the repo.
2. **Group Leaderboard:** title, date, game quick picks, rankings, recent submissions, join/submit/share actions.
3. **Create / Link Leaderboard:** choose existing leaderboard or create; display sharing instructions; confirm group association when verified.
4. **Submit Score:** game picker, multi-line share-text input, preview parsed result, submit confirmation, duplicate/error messages.
5. **Account / Settings:** linked identities, unlink, privacy disclosure; group management options only for authorized owners.
6. **Fallback / Error:** no group context, expired invite, unsupported WeChat version, already-linked group, invalid score, and network errors.

**Design constraints**

- Treat the Mini Program as a thin client of the same Daily Tracker API.
- Use a compact, fast, mobile layout rather than embedding the full Next.js website unchanged.
- Use a React-compatible WeChat framework (e.g., **Taro**) only if repo/build compatibility is validated; native Mini Program is an acceptable alternative.
- Never require a user to install a bot into a WeChat group.
- Make the distinction between **group verified** and **accessed by invitation** visible in link-management UX.

## 5. WeChat API integration

### 5.1 Authentication

- Obtain a short-lived login code through `wx.login()` in the Mini Program.
- Send this code over HTTPS to the Spring Boot backend.
- Backend exchanges it with the official WeChat `jscode2session` API using server-held credentials, obtains the app-scoped WeChat `openid` and session key, and issues a **Daily Tracker session**.
- Never send the AppSecret, session key, or platform API credentials to the Mini Program.
- Support existing Daily Tracker account linking with a short-lived, single-use code, explicitly confirmed by the user.
- Do **not** use WeChat group/member identifiers as proof of a Daily Tracker user identity.

### 5.2 Verified group context

Preferred for supported group-launch scenes:

- Call `wx.getGroupEnterInfo()` and handle its `encryptedData` / `iv` output according to current official guidance.
- The backend decrypts data using the session key associated with the **same WeChat login session**, validates the app identity/watermark and payload, and extracts `openGId` (or equivalent documented identifier).
- Support `wx.getShareInfo()` with a `shareTicket` only as a validated compatibility path if necessary; do not assume share tickets exist in all launch modes.
- Group identity can be missing for launches from search, favorites, direct links, unsupported versions, or non-group shares. Those cases use the invite-token fallback.
- The same `openGId` must be scoped to the Mini Program AppID; do not assume it matches a WeCom group ID or is portable across apps.
- Treat group-context verification as a claim that the launch came from a specific group **in a supported scene**, not as blanket authorization to view all group membership or send messages to it.

### 5.3 Sharing

- Implement standard user-initiated Mini Program card sharing with a short-lived **opaque share reference** in the card path.
- Share title: `Daily Tracker — {leaderboardName}` (escape and bound length).
- Share destination must be a registered Mini Program page.
- Do not include scores, email addresses, auth tokens, `openid`, or `openGId` in share URLs.
- Shared card preview may be static; **do not require automatic live updates in Phase 1**.
- Display clear instructions for sending the card into the intended existing group.

### 5.4 Optional Chat Tool Mode adapter (Phase 2)

Potential APIs, **only if documented and available to the registered app**:

- `wx.openChatTool`
- `wx.getChatToolInfo`
- `wx.selectGroupMembers`
- `wx.shareAppMessageToGroup`
- `wx.shareImageToGroup`
- `wx.notifyGroupMembers`
- WeChat's documented dynamic-message/update APIs, where available

Create an adapter with `isChatToolSupported()` and configuration flag `WECHAT_CHAT_TOOL_ENABLED=false` by default. Feature must degrade to regular card sharing when unsupported or unauthorized. Do not call these from Phase 1's normal flow.

## 6. Backend design (Spring Boot)

Adapt naming and package structure to the repository; **inspect existing APIs/entities before creating new ones**.

### Core identities and mappings

Use the existing player/account and leaderboard tables as authoritative.

**`platform_identity`** (reuse if already present)

| Field | Purpose |
|---|---|
| `id` | Internal primary key |
| `platform` | `WECHAT` |
| `platform_app_id` | Registered Mini Program app identifier |
| `platform_user_id` | WeChat user `openid`, encrypted or protected at rest |
| `user_id` | Existing Daily Tracker account ID |
| `linked_at`, `unlinked_at` | Lifecycle audit data |

Unique active identity mapping by `(platform, platform_app_id, platform_user_id)`.

**`platform_group_link`**

| Field | Purpose |
|---|---|
| `id` | Internal primary key |
| `platform` | `WECHAT` |
| `platform_app_id` | App scope |
| `external_group_key` | Protected lookup key derived from the verified `openGId` (e.g., keyed HMAC) |
| `leaderboard_id` | Existing leaderboard UUID |
| `linked_by_user_id` | Daily Tracker creator/linking user |
| `linked_at`, `disconnected_at` | Lifecycle |
| `status` | `ACTIVE`, `DISCONNECTED` |

Unique **active** mapping for `(platform, platform_app_id, external_group_key)`; decide whether one group may have multiple leaderboards. For MVP, **one active leaderboard per group**; make the policy configurable later.

**`platform_invite`** (reuse existing invites if possible)

- Random, opaque token stored as a one-way hash.
- Scoped to leaderboard and purpose (`JOIN`, `GROUP_LINK`).
- Expiration, single-use policy where appropriate, creator, consumed timestamp.
- Invite URL is only a **locator**, not proof of group administration or account identity.
- Rate-limit validation and consumption.

### Proposed endpoints (names illustrative)

| Method | Endpoint | Behavior |
|---|---|---|
| `POST` | `/api/integrations/wechat/session` | Exchange WeChat login code; create authenticated Daily Tracker session |
| `POST` | `/api/integrations/wechat/link-code/redeem` | Link existing Daily Tracker account using single-use code |
| `DELETE` | `/api/integrations/wechat/identity` | Unlink current user identity |
| `POST` | `/api/integrations/wechat/group-context/resolve` | Validate/decrypt group launch evidence; return existing mapping or temporary verified-context claim |
| `POST` | `/api/integrations/wechat/group-links` | Explicitly link verified group to owned/authorized leaderboard |
| `GET` | `/api/integrations/wechat/group-links/current` | Get current verified group's associated leaderboard |
| `DELETE` | `/api/integrations/wechat/group-links/{id}` | Disconnect mapping with owner authorization |
| `POST` | `/api/leaderboards/{leaderboardId}/invites` | Reuse existing invite creation logic |
| Existing | Existing score/leaderboard endpoints | Reuse all scoring, parsing, membership, and ranking rules |

The server must bind a short-lived resolved group-context claim to the **authenticated session**; never trust an `openGId` supplied as plaintext or a caller-provided `userId`/`playerId`. Require explicit confirmation for `group-links` creation. Use the authorization model of the existing repository.

### Platform-agnostic service contracts

Prefer to implement or reuse these abstractions so Discord, Telegram, and WeChat share business logic:

- `PlatformIdentityService`
- `PlatformGroupLinkService`
- `LeaderboardInviteService`
- `LeaderboardScoreSubmissionService`
- `PlatformShareAdapter` (may return user-facing card metadata instead of actually sending)

Keep platform-specific login and group-context handling behind `WeChatAuthAdapter` and `WeChatGroupContextAdapter`.

## 7. Security, reliability, and privacy

- Require HTTPS and authenticate all mutations.
- Verify app credentials, session key ownership, encrypted payload integrity/watermark, freshness, and allowed launch scene per current official guidance.
- Store WeChat AppSecret and other secrets only in environment-managed secrets; never in Git.
- Limit collection of WeChat data to identifiers required for linking; avoid collecting group member lists or profile details by default.
- Use protected/hardened lookup representation for group identifiers; do not log raw session keys, share tickets, codes, full game text, or platform identifiers.
- Add replay resistance and expiration for group-context proofs and invites.
- Enforce server-side leaderboard ownership/membership; a shared card alone must not grant admin privileges.
- Apply idempotency/duplicate detection to game submissions according to existing rules.
- Handle app-session expiration, WeChat API failures, network retries, and revoked identity links.
- Rate-limit auth, invite redemption, group resolution, group linking, and score submissions.
- Add audit events for identity linking/unlinking and group-link creation/change/removal.
- Publish privacy disclosures appropriate to WeChat's Mini Program review requirements.
- Avoid building any scraping, unofficial personal-WeChat bot, or message interception mechanism.

## 8. Feature flags and environment variables

Use the project's existing configuration mechanism. Names are proposed:

```text
WECHAT_MINIPROGRAM_ENABLED=false
WECHAT_APP_ID=...
WECHAT_APP_SECRET=...              # server-side only
WECHAT_CHAT_TOOL_ENABLED=false    # keep disabled until verified/approved
WECHAT_GROUP_CONTEXT_ENABLED=true # turn off if API eligibility fails
```

Avoid exposing secret values to Next.js public config or the Mini Program package. Add environment-specific redirect/allowlisted server domains as required by the WeChat console.

## 9. Edge cases / acceptance tests

- [ ] Existing WeChat group member launches from a supported group-shared card; backend identifies verified group and resolves the expected leaderboard.
- [ ] Launch from search/direct share without group proof still reaches the invited leaderboard without falsely claiming a verified group mapping.
- [ ] Two distinct WeChat groups with the same members remain separate.
- [ ] Already-mapped group cannot be silently remapped by another player.
- [ ] A person cannot use another player's `playerId`, another group's ID, or an arbitrary leaderboard UUID to post on someone else's behalf.
- [ ] Existing Daily Tracker player can link/unlink WeChat identity; duplicate/conflicting account links are rejected.
- [ ] Expired, reused, or tampered invite/link codes fail safely.
- [ ] Paste-and-submit works for existing supported daily game formats; score is reflected in ranking.
- [ ] Duplicate submissions follow current backend policy; repeated client retries do not accidentally double-count scores.
- [ ] Members can view the leaderboard after opening the card, subject to existing membership/access rules.
- [ ] Group context API failure has a useful fallback and no crash.
- [ ] Card sharing is user-initiated and does not promise automatic group-message ingestion.
- [ ] Chat Tool Mode disabled by default leaves Phase 1 fully functional.
- [ ] Production authentication/secrets/error cases have integration tests and safe logs.

## 10. Codex execution plan

1. **Inspect the repository first.** Identify backend authentication, player identity, invite handling, leaderboard authorization, score parsing, frontend build tooling, and any existing Discord/Telegram platform adapters.
2. **Write a short implementation plan** listing files, migrations, and whether a new Mini Program client project is needed. Identify any platform constraints that cannot be validated from the codebase.
3. **Implement Phase 1 backend** with database migrations, WeChat session exchange, verified group-context resolver, platform identity mapping, invite flows, group linking, tests, and feature flags.
4. **Implement a minimal Mini Program frontend** using a validated Taro+React setup or native Mini Program stack. Reuse shared types/API contracts where practical, not browser-only Next.js components.
5. **Reuse existing game logic** without copying parsers or changing rankings; ensure all submissions go through authenticated backend APIs.
6. **Add sharing and fallback flows.** Test from actual WeChat group cards in a supported test account/client and test launch scenes without group context.
7. **Add documentation** covering WeChat registration, AppID/AppSecret setup, allowed HTTPS domains, privacy requirements, developer tools, local testing, and release process.
8. **Leave Phase 2 as an isolated, gated integration** until console eligibility, required framework configuration, current API availability, and app approval are proven.

### Suggested Codex instruction

> Implement the WeChat Mini Program integration described in `WECHAT_MINI_PROGRAM_DAILY_TRACKER_INTEGRATION.md`. Start by inspecting the existing architecture, identify reusable identity/invite/leaderboard/score components, and implement **Phase 1 only**. Do not change existing scoring rules or rely on Chat Tool beta APIs. Preserve backend authorization, add migrations and tests, use a user-initiated group share, handle missing verified WeChat group context with an invite fallback, and document any registration/console steps I must complete manually. Do not use unsupported/unofficial personal-WeChat bot APIs. Explicitly report any WeChat platform behavior that cannot be validated without real developer-console access.

## 11. Documentation and verification links

These are integration references, **not guarantees** of current production eligibility. Check them against the registered app and current WeChat developer console before coding platform-specific API behavior.

- Official Mini Program group launch API: https://developers.weixin.qq.com/miniprogram/dev/api/open-api/group/wx.getGroupEnterInfo.html
- Official Mini Program sharing: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/share.html
- Official Mini Program login: https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html
- Official Chat Tool documentation: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/chatTool.html
- Taro group context API: https://nervjs.github.io/taro-docs/en/docs/apis/open-api/group/getGroupEnterInfo/
- Chat Tool beta announcement/background (March 2025): https://www.ithome.com/0/836/981.htm

**Open platform validation items:** whether the current Mini Program registration category and developer account are eligible; whether `wx.getGroupEnterInfo()` produces usable group context for the target client and entry scene; whether Chat Tool Mode is enabled and approved; whether dynamic cards/notifications are permitted; and whether region-specific registration or publication requirements apply.
