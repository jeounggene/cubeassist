import { describe, it, expect } from "vitest";
import { generateScramble, generateCrossScramble } from "./scramble";
import { optimalCrossLength } from "./cross";

const AXIS: Record<string, string> = { U: "y", D: "y", L: "x", R: "x", F: "z", B: "z" };
const faceOf = (move: string) => move[0];

describe("generateScramble", () => {
  it("returns the requested number of moves", () => {
    expect(generateScramble(20).split(" ")).toHaveLength(20);
    expect(generateScramble(5).split(" ")).toHaveLength(5);
  });

  it("never repeats a face consecutively, never three same-axis in a row", () => {
    const moves = generateScramble(200).split(" ");
    for (let i = 1; i < moves.length; i++) {
      expect(faceOf(moves[i])).not.toBe(faceOf(moves[i - 1]));
      if (i >= 2) {
        const sameAxis =
          AXIS[faceOf(moves[i])] === AXIS[faceOf(moves[i - 1])] &&
          AXIS[faceOf(moves[i])] === AXIS[faceOf(moves[i - 2])];
        expect(sameAxis).toBe(false);
      }
    }
  });

  it("uses only legal face letters and modifiers", () => {
    for (const m of generateScramble(100).split(" ")) {
      expect(m).toMatch(/^[UDLRFB]('|2)?$/);
    }
  });
});

describe("generateCrossScramble", () => {
  it("produces a scramble with the exact target cross length for 2..8", () => {
    for (let k = 2; k <= 8; k++) {
      const scr = generateCrossScramble(k);
      expect(optimalCrossLength(scr)).toBe(k);
    }
  });
});
