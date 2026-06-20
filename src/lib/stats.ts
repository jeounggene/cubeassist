export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Average of the last `n` samples, formatted to 2 decimals. Returns "—" until
// at least `n` samples exist (e.g. an Ao5 needs 5 solves).
export function avgOfLast(xs: number[], n: number): string {
  if (xs.length < n) return "—";
  return mean(xs.slice(-n)).toFixed(2);
}
