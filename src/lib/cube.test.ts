import { describe, it, expect } from "vitest";
import { solved, applyScramble, invertScramble } from "./cube";

const isSolved = (s: ReturnType<typeof solved>) =>
  s.perm.every((p, i) => p === i) && s.ori.every((o) => o === 0);

describe("cube edge model", () => {
  it("solved() is the identity state", () => {
    const s = solved();
    expect(s.perm).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(s.ori).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("applying R four times is the identity", () => {
    expect(isSolved(applyScramble(solved(), "R R R R"))).toBe(true);
  });

  it("applying each face four times is the identity", () => {
    for (const f of ["U", "D", "R", "L", "F", "B"]) {
      expect(isSolved(applyScramble(solved(), `${f} ${f} ${f} ${f}`))).toBe(true);
    }
  });

  it("sexy move (R U R' U') applied six times is the identity", () => {
    const sexy = "R U R' U' ".repeat(6);
    expect(isSolved(applyScramble(solved(), sexy))).toBe(true);
  });

  it("X2 equals X X for every face", () => {
    for (const f of ["U", "D", "R", "L", "F", "B"]) {
      const a = applyScramble(solved(), `${f}2`);
      const b = applyScramble(solved(), `${f} ${f}`);
      expect(a).toEqual(b);
    }
  });

  it("invertScramble reverses and inverts each move", () => {
    expect(invertScramble("R U R'")).toBe("R U' R'");
    expect(invertScramble("F2 D' L")).toBe("L' D F2");
  });

  it("a scramble followed by its inverse is the identity", () => {
    const scr = "R U2 F' D L2 B";
    const s = applyScramble(solved(), scr);
    expect(isSolved(applyScramble(s, invertScramble(scr)))).toBe(true);
  });
});
