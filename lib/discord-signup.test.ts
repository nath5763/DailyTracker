import { describe, expect, it } from "vitest";
import { discordSignupNext } from "./discord-signup";

describe("discord signup continuation", () => {
  it("accepts only a well-formed local signup intent path", () => {
    const token = "a".repeat(43);
    expect(discordSignupNext(`/discord/signup?intent=${token}`)).toBe(`/discord/signup?intent=${token}`);
    expect(discordSignupNext("https://other.example/discord/signup?intent=" + token)).toBeNull();
    expect(discordSignupNext(`/discord/signup?intent=${token}&redirect=https://other.example`)).toBeNull();
  });
});
