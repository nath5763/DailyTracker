export type DiscordErrorBody = { error?: string; code?: string };

export async function readDiscordResponse<T>(response: Response, fallback: string): Promise<T & DiscordErrorBody> {
  const contentType = response.headers.get("content-type") ?? "";
  const unexpected = `${fallback} The server returned an unexpected response (HTTP ${response.status}). Please try again.`;
  if (!contentType.toLowerCase().includes("json")) throw new Error(unexpected);
  try {
    return await response.json() as T & DiscordErrorBody;
  } catch {
    throw new Error(unexpected);
  }
}
