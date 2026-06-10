import { optimalCrossLength } from "./cross";

const FACES = ["U", "D", "L", "R", "F", "B"];
const MODIFIERS = ["", "'", "2"];
const AXIS: Record<string, string> = {
  U: "y",
  D: "y",
  L: "x",
  R: "x",
  F: "z",
  B: "z",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateScramble(n = 20): string {
  const moves: string[] = [];
  let prev = "";
  let prev2 = "";
  while (moves.length < n) {
    const face = pick(FACES);
    if (face === prev) continue; // no two consecutive same face
    if (
      prev !== "" &&
      prev2 !== "" &&
      AXIS[face] === AXIS[prev] &&
      AXIS[face] === AXIS[prev2]
    ) {
      continue; // no three consecutive same axis
    }
    moves.push(face + pick(MODIFIERS));
    prev2 = prev;
    prev = face;
  }
  return moves.join(" ");
}

// Retry random scrambles until the optimal white-cross length equals targetLen.
export function generateCrossScramble(targetLen: number, maxTries = 50000): string {
  for (let i = 0; i < maxTries; i++) {
    const scr = generateScramble(20);
    if (optimalCrossLength(scr) === targetLen) return scr;
  }
  throw new Error(`Could not generate a cross scramble of length ${targetLen}`);
}
