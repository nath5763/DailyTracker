import { discordSignupNext } from "./discord-signup";
import { telegramSignupNext } from "./telegram-signup";
import { leaderboardInviteNext } from "./leaderboard-invite";

export function authNext(value?: string): string {
  return leaderboardInviteNext(value) ?? discordSignupNext(value) ?? telegramSignupNext(value)
    ?? (value === "/pricing" ? "/pricing" : "/dashboard");
}
