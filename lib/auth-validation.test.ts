import { describe, expect, it } from "vitest";
import { passwordIsValid } from "./auth-validation";

describe("passwordIsValid", () => {
  it("accepts passphrases between 15 and 72 UTF-8 bytes", () => {
    expect(passwordIsValid("a secure phrase!")).toBe(true);
    expect(passwordIsValid("x".repeat(72))).toBe(true);
  });

  it("rejects short and oversized passwords including multibyte values", () => {
    expect(passwordIsValid("too short")).toBe(false);
    expect(passwordIsValid("x".repeat(73))).toBe(false);
    expect(passwordIsValid("🦐".repeat(19))).toBe(false);
  });
});
