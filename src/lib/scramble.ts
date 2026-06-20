import { optimalCrossLength } from "./cross";
import type { CrossColor } from "./cross";

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

// Random scramble drawn from the given face set, keeping the standard
// constraints: never the same face twice in a row, never three moves on the
// same axis in a row.
function scrambleFromFaces(faces: string[], n: number): string {
  const moves: string[] = [];
  let prev = "";
  let prev2 = "";
  while (moves.length < n) {
    const face = pick(faces);
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

export function generateScramble(n = 20): string {
  return scrambleFromFaces(FACES, n);
}

// 2-gen scramble using only R and U turns (the classic speedcube "RU" event).
export function generateRUScramble(n = 15): string {
  return scrambleFromFaces(["R", "U"], n);
}

// 3-gen scramble using only R, U and L turns.
export function generateRULScramble(n = 18): string {
  return scrambleFromFaces(["R", "U", "L"], n);
}

// Retry random scrambles until the optimal cross length for `color` equals targetLen.
export function generateCrossScramble(
  targetLen: number,
  color: CrossColor = "white",
  maxTries = 50000,
): string {
  for (let i = 0; i < maxTries; i++) {
    const scr = generateScramble(20);
    if (optimalCrossLength(scr, color) === targetLen) return scr;
  }
  throw new Error(`Could not generate a ${color} cross scramble of length ${targetLen}`);
}
