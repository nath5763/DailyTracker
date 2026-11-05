import { describe, expect, it } from "vitest";
import { authNext } from "./auth-next";

describe("authNext", () => {
  const invite = "12345678-1234-1234-1234-123456789abc." + "a".repeat(43);
  it("preserves an invite through authentication", () => {
    expect(authNext(`/join?invite=${invite}`)).toBe(`/join?invite=${invite}`);
  });
  it("rejects external and extra redirect parameters", () => {
    expect(authNext(`https://example.com/join?invite=${invite}`)).toBe("/dashboard");
    expect(authNext(`/join?invite=${invite}&next=https://example.com`)).toBe("/dashboard");
  });
});
