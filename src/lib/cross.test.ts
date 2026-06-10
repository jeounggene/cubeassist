import { describe, it, expect } from "vitest";
import { optimalCrossLength, solveCross, crossDistanceTable } from "./cross";
import { solved, applyScramble } from "./cube";

const CROSS_PIECES = [4, 5, 6, 7];
const crossSolved = (scramble: string): boolean => {
  const s = applyScramble(solved(), scramble);
  return CROSS_PIECES.every((p) => {
    const slot = s.perm.indexOf(p);
    return slot === p && s.ori[slot] === 0;
  });
};

describe("optimalCrossLength", () => {
  it("is 0 for the solved cube", () => {
    expect(optimalCrossLength("")).toBe(0);
  });

  it("is 0 after a U move (cross is untouched)", () => {
    expect(optimalCrossLength("U")).toBe(0);
  });

  it("is 1 after a single D move", () => {
    expect(optimalCrossLength("D")).toBe(1);
  });

  it("is 1 after a single F move", () => {
    expect(optimalCrossLength("F")).toBe(1);
  });

  it("is 0 after a sexy move (cross preserved)", () => {
    expect(optimalCrossLength("R U R' U'")).toBe(0);
  });
});

describe("crossDistanceTable", () => {
  it("covers a large reachable set with max distance <= 8", () => {
    const table = crossDistanceTable();
    expect(table.size).toBeGreaterThan(100000);
    let max = 0;
    for (const d of table.values()) max = Math.max(max, d);
    expect(max).toBeLessThanOrEqual(8);
  });
});

describe("solveCross", () => {
  it("returns an empty solution for the solved cube", () => {
    expect(solveCross("")).toBe("");
  });

  it("produces an optimal-length solution that actually solves the cross", () => {
    for (const scr of ["D", "F", "R U R' D2 F", "B' L F2 D R", "F R U' L2 B D"]) {
      const sol = solveCross(scr);
      const len = sol === "" ? 0 : sol.split(" ").length;
      expect(len).toBe(optimalCrossLength(scr));
      expect(crossSolved(`${scr} ${sol}`.trim())).toBe(true);
    }
  });
});
