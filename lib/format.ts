export function formatScore(value: number | null): string {
  return value === null ? "—" : `${Number(value).toFixed(2)}×`;
}
