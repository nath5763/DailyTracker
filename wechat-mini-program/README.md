# Daily Tracker WeChat Mini Program

The ordinary Mini Program shares invitation cards with existing WeChat groups. The optional Chat Tool build adds a group-bound, independent Skyline package for viewing a leaderboard, submitting scores, selecting members to remind, and sharing a card into the active chat. Both clients use the existing Daily Tracker account, leaderboard, parsing, and scoring API. A player must still paste a result; neither mode reads regular chat messages.

## Developer-console setup

1. Register the Mini Program and obtain its AppID and AppSecret. Confirm your account is approved for **Chat Tool Mode** before building the Chat Tool variant. The [official Chat Tool guide](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/chatTool.html) still labels it beta and requires an independent Skyline subpackage of at most 500 KB, a supported client, and base library 3.7.8 or newer. Console approval and device behavior cannot be verified from this repository.
2. In the console, register your public HTTPS backend origin as a **request legal domain**. Complete Mini Program privacy declarations, service category, test-user access, and publication review. Include account linking, group associations, score text, and the dynamic-card participant identifier if you enable dynamic cards.
3. On the server, set `WECHAT_APP_ID`, `WECHAT_APP_SECRET`, and `WECHAT_SESSION_ENCRYPTION_KEY` (32 random bytes encoded as base64, for example `openssl rand -base64 32`). Keep both secrets server-side and preserve the encryption key across deploys. Apply Flyway migrations **V44** and **V45** before enabling the integration.
4. For the ordinary package, set `wechat-mini-program/config.js` to the same HTTPS origin (without `/api/v1`) and set `project.config.json` to the real AppID. Import `wechat-mini-program/` in WeChat Developer Tools. Set `WECHAT_MINIPROGRAM_ENABLED=true` on the backend. Turn on `WECHAT_GROUP_CONTEXT_ENABLED=true` only after a real group launch provides valid encrypted group proof.
5. For Chat Tool Mode, build the separate package after approval. In PowerShell:

   ```powershell
   $env:WECHAT_CHAT_TOOL_APPROVED = 'true'
   $env:WECHAT_APP_ID = 'wxYOUR16CHARACTERID'
   $env:WECHAT_API_BASE_URL = 'https://your-api.example.com'
   npm --prefix wechat-mini-program run build:chat-tool
   ```

   Import `wechat-mini-program/dist-chat-tool/` as a **separate project** in WeChat Developer Tools, preview it on a real supported phone, then submit that package for review. The build is blocked without the approval variable, valid AppID, and HTTPS origin. The generated package has one independent Chat Tool subpackage; it is ignored by Git. The ordinary source package stays usable for Phase 1.
6. After the approved build passes console validation, enable `WECHAT_CHAT_TOOL_APPROVED=true` and `WECHAT_CHAT_TOOL_ENABLED=true` on the backend. The server refuses startup if the Chat Tool flag is enabled without Mini Program support and approval. Set `WECHAT_DYNAMIC_CARDS_ENABLED=true` only after dynamic-card API permission is confirmed. `WECHAT_CHAT_TOOL_VERSION_TYPE` is `1` for developer, `2` for experience, and `0` for production cards; use the value matching the package under test. The app secret and access token never enter the client.

## Real-device acceptance checks

- Sign in on the ordinary package, link an existing website account using the Profile one-time code, share an invitation card into two different groups, and confirm group mappings remain separate. Check direct-message/search launches fall back to invitation access without claiming a verified group.
- Open a leaderboard, tap **Open chat tool**, choose a group, and verify the independent page resolves that group. If it is unmapped, the leaderboard owner explicitly links it. A different mapped leaderboard must not be silently replaced.
- Open a chat-shared card as another member, join the leaderboard, paste a supported game result, preview it, confirm it, and check today's standings. Retry the same result to confirm the existing duplicate rule. Test the LoLdle date path separately.
- Select members and send a reminder by tapping the reminder button. Share a card to the active chat. If dynamic cards are enabled, confirm the card's participant state changes after a member submits a score, and that an expired card is no longer updated. The [Chat Tool guide](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/chatTool.html) describes these as platform-controlled flows; there is no unattended chat posting.
- Disconnect the group mapping as the leaderboard owner and unlink a WeChat identity. Verify historical scores remain and the old Mini Program session expires. Also test expired share references, expired link codes, unsupported clients, and network failures.

## Flags and verification

| Backend variable | Default | Purpose |
| --- | --- | --- |
| `WECHAT_MINIPROGRAM_ENABLED` | `false` | Login, sessions, and ordinary sharing. |
| `WECHAT_GROUP_CONTEXT_ENABLED` | `false` | Ordinary group proof. |
| `WECHAT_CHAT_TOOL_APPROVED` | `false` | Explicit console-approval gate. |
| `WECHAT_CHAT_TOOL_ENABLED` | `false` | Chat Tool API availability. |
| `WECHAT_DYNAMIC_CARDS_ENABLED` | `false` | Server-issued activity IDs and card updates. |
| `WECHAT_CHAT_TOOL_VERSION_TYPE` | `0` | Card environment: production 0, developer 1, experience 2. |

Run `npm --prefix wechat-mini-program test` for native adapter tests and `mvn test` from the Spring Boot backend. The PostgreSQL integration tests need Docker. The generated Chat Tool package must also pass WeChat Developer Tools upload validation and real-device checks; repository tests cannot prove console eligibility or live WeChat API permissions. The [official Chat Tool documentation](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/chatTool.html), [member reminder API](https://developers.weixin.qq.com/miniprogram/dev/api/chattool/wx.notifyGroupMembers.html), and [server dynamic-card API](https://developers.weixin.qq.com/miniprogram/dev/server/API/mp-message-management/updatable-message/api_setchattoolmsg.html) are the platform references.
