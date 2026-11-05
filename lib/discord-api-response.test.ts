import { expect, test } from "vitest";
import { readDiscordResponse } from "./discord-api-response";

test("reports the status when a proxy returns HTML instead of API JSON", async () => {
  const response = new Response("<!DOCTYPE html><html></html>", {
    status: 504, headers: { "content-type": "text/html" },
  });
  await expect(readDiscordResponse(response, "Could not connect this channel."))
    .rejects.toThrow("Could not connect this channel. The server returned an unexpected response (HTTP 504).");
});

test("keeps API error details for a JSON response", async () => {
  const response = new Response(JSON.stringify({ code: "CHANNEL_UNAVAILABLE", error: "Channel unavailable." }), {
    status: 409, headers: { "content-type": "application/json" },
  });
  await expect(readDiscordResponse(response, "Could not connect this channel."))
    .resolves.toEqual({ code: "CHANNEL_UNAVAILABLE", error: "Channel unavailable." });
});
