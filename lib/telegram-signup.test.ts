import { expect, test } from "vitest";
import { telegramSignupNext } from "./telegram-signup";

test("accepts only local Telegram signup continuations", () => {
  const token = "a".repeat(43);
  expect(telegramSignupNext(`/telegram/signup?intent=${token}`)).toBe(`/telegram/signup?intent=${token}`);
  expect(telegramSignupNext(`https://example.com/telegram/signup?intent=${token}`)).toBeNull();
  expect(telegramSignupNext(`/telegram/signup?intent=${token}&next=https://example.com`)).toBeNull();
});
