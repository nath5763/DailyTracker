import { describe, expect, it } from "vitest";
import { getPublicOrigin } from "./public-origin";

describe("getPublicOrigin", () => {
  it("prefers the configured public site over an internal Render origin", () => {
    const request = new Request("https://localhost:10000/auth/callback?code=test");
    expect(getPublicOrigin(request, "https://daily-club.onrender.com")).toBe("https://daily-club.onrender.com");
  });

  it("uses trusted proxy headers when no public site is configured", () => {
    const request = new Request("https://localhost:10000/auth/callback", {
      headers: {
        "x-forwarded-host": "daily-club-ab12.onrender.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(getPublicOrigin(request, undefined)).toBe("https://daily-club-ab12.onrender.com");
  });

  it("falls back to the request origin during local development", () => {
    const request = new Request("http://localhost:3000/auth/callback");
    expect(getPublicOrigin(request, undefined)).toBe("http://localhost:3000");
  });
});
