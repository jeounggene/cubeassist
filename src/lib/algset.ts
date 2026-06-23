// Combined OLL + PLL case data and helpers for the alg-set trainer, which drills
// a user-chosen subset of cases.
import { invertAlg } from "./facecube";
import ollCases from "../data/cases/oll.json";
import pllCases from "../data/cases/pll.json";

export type AlgKind = "oll" | "pll";
export type AlgCase = { id: string; name: string; kind: AlgKind; algs: string[] };

type Raw = { id: string; name: string; algs?: string[] };
const tag = (cases: Raw[], kind: AlgKind): AlgCase[] =>
  cases.map((c) => ({ id: c.id, name: c.name, kind, algs: c.algs ?? [] }));

export const OLL_CASES: AlgCase[] = tag(ollCases as Raw[], "oll");
export const PLL_CASES: AlgCase[] = tag(pllCases as Raw[], "pll");
export const ALL_CASES: AlgCase[] = [...OLL_CASES, ...PLL_CASES];

// OLL cases grouped by their named shape. Mapping verified against SpeedCubeDB /
// the Speedsolving wiki; every OLL 1–57 appears in exactly one group (28 and 57
// are all-corners-oriented, so they live in OCLL). Order is roughly easy→hard.
const OLL_SHAPES: { shape: string; nums: number[] }[] = [
  { shape: "Dot", nums: [1, 2, 3, 4, 17, 18, 19, 20] },
  { shape: "Line", nums: [51, 52, 55, 56] },
  { shape: "L", nums: [47, 48, 49, 50, 53, 54] },
  { shape: "Square", nums: [5, 6] },
  { shape: "Small Lightning", nums: [7, 8, 11, 12] },
  { shape: "Big Lightning", nums: [39, 40] },
  { shape: "Fish", nums: [9, 10, 35, 37] },
  { shape: "Knight Move", nums: [13, 14, 15, 16] },
  { shape: "Awkward", nums: [29, 30, 41, 42] },
  { shape: "P", nums: [31, 32, 43, 44] },
  { shape: "T", nums: [33, 45] },
  { shape: "C", nums: [34, 46] },
  { shape: "W", nums: [36, 38] },
  { shape: "OCLL", nums: [21, 22, 23, 24, 25, 26, 27, 28, 57] },
];

const ollById = new Map(OLL_CASES.map((c) => [c.id, c]));
const ollByNum = (n: number): AlgCase => {
  const c = ollById.get(`OLL-${String(n).padStart(2, "0")}`);
  if (!c) throw new Error(`Unknown OLL case ${n}`);
  return c;
};

export const OLL_GROUPS: { shape: string; cases: AlgCase[] }[] = OLL_SHAPES.map((g) => ({
  shape: g.shape,
  cases: g.nums.map(ollByNum),
}));

// A scramble that, applied to a solved cube, leaves exactly this case: invert the
// solving alg, then (optionally) an AUF so the same case isn't always identical.
export function scrambleForCase(alg: string, auf: string): string {
  return [invertAlg(alg), auf].filter(Boolean).join(" ");
}

// "OLL 01" -> "#01", "PLL Aa perm" -> "Aa".
export function caseShort(name: string): string {
  return name
    .replace(/^OLL /, "#")
    .replace(/^PLL /, "")
    .replace(/ perm$/, "");
}
