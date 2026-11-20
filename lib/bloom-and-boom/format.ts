export function formatBloomTime(milliseconds: number) {
  const safe = Math.max(0, milliseconds);
  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor(safe % 60_000 / 1_000);
  const hundredths = Math.floor(safe % 1_000 / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
}
