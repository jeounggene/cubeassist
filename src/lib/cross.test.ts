import { describe, it, expect } from "vitest";
import { optimalCrossLength, solveCross, crossDistanceTable, CROSS_COLORS } from "./cross";
import type { CrossColor } from "./cross";
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

// Independent color->pieces map for verifying color-neutral behavior.
const PIECES: Record<string, number[]> = {
  white: [4, 5, 6, 7], // D
  yellow: [0, 1, 2, 3], // U
  green: [0, 4, 8, 9], // F
};
const crossSolvedForColor = (scramble: string, color: string): boolean => {
  const s = applyScramble(solved(), scramble);
  return PIECES[color].every((p) => {
    const slot = s.perm.indexOf(p);
    return slot === p && s.ori[slot] === 0;
  });
};

describe("color-neutral cross", () => {
  it("is 0 for any solved color", () => {
    const colors: CrossColor[] = ["white", "yellow", "green"];
    for (const c of colors) {
      expect(optimalCrossLength("", c)).toBe(0);
    }
  });

  it("a U move leaves the white cross but scrambles the yellow (U-face) cross", () => {
    expect(optimalCrossLength("U", "white")).toBe(0);
    expect(optimalCrossLength("U", "yellow")).toBe(1);
  });

  it("solveCross solves the chosen color's cross at optimal length", () => {
    const colors: CrossColor[] = ["yellow", "green"];
    for (const color of colors) {
      for (const scr of ["R U2 F' D", "B' L F2 D R"]) {
        const sol = solveCross(scr, color);
        const len = sol === "" ? 0 : sol.split(" ").length;
        expect(len).toBe(optimalCrossLength(scr, color));
        expect(crossSolvedForColor(`${scr} ${sol}`.trim(), color)).toBe(true);
      }
    }
  });

  it("exposes the six cross colors", () => {
    expect(CROSS_COLORS).toEqual([
      "white",
      "yellow",
      "green",
      "blue",
      "red",
      "orange",
    ]);
  });
});
