import { discordSignupNext } from "./discord-signup";
import { leaderboardInviteNext } from "./leaderboard-invite";

export function authNext(value?: string): string {
  return leaderboardInviteNext(value) ?? discordSignupNext(value)
    ?? (value === "/pricing" ? "/pricing" : "/dashboard");
}
