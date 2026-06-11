import { describe, it, expect } from "vitest";
import { solved, applyAlg, invertAlg, isSolvedUpToRotation, normalizeOrientation } from "./facecube";

const eq = (a: number[], b: number[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

describe("facecube model", () => {
  it("solved() has 54 facelets, 9 of each color", () => {
    const s = solved();
    expect(s).toHaveLength(54);
    const counts = [0, 0, 0, 0, 0, 0];
    for (const c of s) counts[c]++;
    expect(counts).toEqual([9, 9, 9, 9, 9, 9]);
  });

  it("applying R four times is the identity", () => {
    expect(eq(applyAlg(solved(), "R R R R"), solved())).toBe(true);
  });

  it("applying each face four times is the identity", () => {
    for (const f of ["U", "D", "R", "L", "F", "B"]) {
      expect(eq(applyAlg(solved(), `${f} ${f} ${f} ${f}`), solved())).toBe(true);
    }
  });

  it("sexy move (R U R' U') applied six times is the identity", () => {
    expect(eq(applyAlg(solved(), "R U R' U' ".repeat(6)), solved())).toBe(true);
  });

  it("X2 equals X X for every face", () => {
    for (const f of ["U", "D", "R", "L", "F", "B"]) {
      expect(eq(applyAlg(solved(), `${f}2`), applyAlg(solved(), `${f} ${f}`))).toBe(true);
    }
  });

  it("invertAlg reverses and inverts each move", () => {
    expect(invertAlg("R U R'")).toBe("R U' R'");
    expect(invertAlg("F2 D' L")).toBe("L' D F2");
  });

  it("a scramble followed by its inverse is the identity", () => {
    const scr = "R U2 F' D L2 B";
    expect(eq(applyAlg(applyAlg(solved(), scr), invertAlg(scr)), solved())).toBe(true);
  });

  it("a single R move actually changes the state", () => {
    expect(eq(applyAlg(solved(), "R"), solved())).toBe(false);
  });

  it("wide moves and rotations: r^4, u^4, x^4 are identity", () => {
    for (const m of ["r", "u", "l", "d", "x", "y", "z", "M"]) {
      expect(eq(applyAlg(solved(), `${m} ${m} ${m} ${m}`), solved())).toBe(true);
    }
  });

  it("a whole-cube rotation is solved up to rotation but not literally solved", () => {
    const rotated = applyAlg(solved(), "x y'");
    expect(eq(rotated, solved())).toBe(false);
    expect(isSolvedUpToRotation(rotated)).toBe(true);
    expect(eq(normalizeOrientation(rotated), solved())).toBe(true);
  });

  it("a wide move equals its face move plus the matching slice (r = R M')", () => {
    expect(eq(applyAlg(solved(), "r"), applyAlg(solved(), "R M'"))).toBe(true);
    expect(eq(applyAlg(solved(), "u"), applyAlg(solved(), "U E'"))).toBe(true);
  });

  it("Rw notation equals lowercase r", () => {
    expect(eq(applyAlg(solved(), "Rw U Rw'"), applyAlg(solved(), "r U r'"))).toBe(true);
  });
});
