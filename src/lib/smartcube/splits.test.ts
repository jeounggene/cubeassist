import { describe, it, expect } from "vitest";
import { solved, applyAlg } from "../facecube";
import { detectSplits, crossSolved, f2lComplete, ollComplete, fullySolved } from "./splits";

const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'"; // an involution (order 2)
const SUNE = "R U R' U R U2 R'";

// Expand an alg into single quarter-turn tokens (so timestamps map to real turns).
function quarters(alg: string): string[] {
  const out: string[] = [];
  for (const tok of alg.trim().split(/\s+/).filter(Boolean)) {
    if (tok.endsWith("2")) out.push(tok[0], tok[0]);
    else out.push(tok);
  }
  return out;
}

// Turn an alg into a timestamped solve-move stream, 100ms per quarter turn.
function moveStream(alg: string): { token: string; t: number }[] {
  return quarters(alg).map((token, i) => ({ token, t: (i + 1) * 100 }));
}

// Exact inverse of an alg (reverse order, flip each quarter/prime; doubles unchanged).
function invert(alg: string): string {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map((t) => (t.endsWith("2") ? t : t.endsWith("'") ? t[0] : `${t}'`))
    .join(" ");
}

describe("stage predicates", () => {
  it("recognise a solved cube on the D face", () => {
    const s = solved();
    expect(crossSolved(s, "D")).toBe(true);
    expect(f2lComplete(s, "D")).toBe(true);
    expect(ollComplete(s, "D")).toBe(true);
    expect(fullySolved(s)).toBe(true);
  });

  it("a U turn keeps F2L + OLL complete but not solved", () => {
    const s = applyAlg(solved(), "U");
    expect(f2lComplete(s, "D")).toBe(true);
    expect(ollComplete(s, "D")).toBe(true);
    expect(fullySolved(s)).toBe(false);
  });

  it("an R turn breaks F2L", () => {
    const s = applyAlg(solved(), "R");
    expect(f2lComplete(s, "D")).toBe(false);
  });

  it("Sune leaves F2L complete but OLL not oriented", () => {
    const s = applyAlg(solved(), SUNE);
    expect(f2lComplete(s, "D")).toBe(true);
    expect(ollComplete(s, "D")).toBe(false);
  });
});

describe("detectSplits", () => {
  it("returns null when the cube never reaches solved", () => {
    const start = applyAlg(solved(), "R U R'");
    const moves = moveStream("U R"); // does not solve
    expect(detectSplits(start, moves)).toBeNull();
  });

  it("splits a PLL-only solve: cross/f2l/oll are 0, pll is the whole time", () => {
    // Start already F2L+OLL solved (only permutation wrong); solve is the T-perm.
    const start = applyAlg(solved(), T_PERM);
    const moves = moveStream(T_PERM); // T-perm is its own inverse → returns to solved
    const res = detectSplits(start, moves)!;
    expect(res).not.toBeNull();
    expect(res.splits.cross).toBe(0);
    expect(res.splits.f2l).toBe(0);
    expect(res.splits.oll).toBe(0);
    expect(res.splits.pll).toBeCloseTo(res.total, 5);
    expect(res.total).toBeCloseTo(moves[moves.length - 1].t / 1000, 5);
    expect(res.moves).toBe(moves.length);
  });

  it("produces non-negative splits that sum to total for any solved-ending stream", () => {
    const scramble = "R U R' U' F R U2 L' B2 D";
    const start = applyAlg(solved(), scramble);
    const moves = moveStream(invert(scramble)); // exact inverse → returns to solved
    const res = detectSplits(start, moves)!;
    expect(res).not.toBeNull();
    const { cross, f2l, oll, pll } = res.splits;
    for (const v of [cross, f2l, oll, pll]) expect(v).toBeGreaterThanOrEqual(0);
    expect(cross + f2l + oll + pll).toBeCloseTo(res.total, 5);
  });
});
