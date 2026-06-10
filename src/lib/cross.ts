import { MOVES, solved, applyScramble } from "./cube";
import type { EdgeState } from "./cube";

export type CrossColor = "white" | "yellow" | "green" | "blue" | "red" | "orange";

// The 4 edge pieces forming each face's cross (by home slot / piece id).
// Slot order: 0 UF 1 UR 2 UB 3 UL 4 DF 5 DR 6 DB 7 DL 8 FR 9 FL 10 BR 11 BL
const CROSS_PIECES_BY_COLOR: Record<CrossColor, number[]> = {
  white: [4, 5, 6, 7], // D face
  yellow: [0, 1, 2, 3], // U face
  green: [0, 4, 8, 9], // F face
  blue: [2, 6, 10, 11], // B face
  red: [1, 5, 8, 10], // R face
  orange: [3, 7, 9, 11], // L face
};

export const CROSS_COLORS = Object.keys(CROSS_PIECES_BY_COLOR) as CrossColor[];

// Pack 4 pieces' (slot, ori) into a single integer: 5 bits each.
function packCoord(slots: number[], oris: number[]): number {
  let coord = 0;
  for (let i = 0; i < 4; i++) {
    const val = (slots[i] << 1) | oris[i]; // slot 0..11, ori 0..1
    coord |= val << (5 * i);
  }
  return coord;
}

function coordOfState(state: EdgeState, pieces: number[]): number {
  const slots: number[] = [];
  const oris: number[] = [];
  for (const p of pieces) {
    const slot = state.perm.indexOf(p);
    slots.push(slot);
    oris.push(state.ori[slot]);
  }
  return packCoord(slots, oris);
}

function solvedCoord(pieces: number[]): number {
  return packCoord(pieces, [0, 0, 0, 0]);
}

function applyMoveToCoord(coord: number, moveIndex: number): number {
  const spec = MOVES[moveIndex];
  const slots: number[] = [];
  const oris: number[] = [];
  for (let i = 0; i < 4; i++) {
    const val = (coord >> (5 * i)) & 31;
    const slot = val >> 1;
    const ori = val & 1;
    slots.push(spec.dest[slot]);
    oris.push(spec.flip[slot] ? ori ^ 1 : ori);
  }
  return packCoord(slots, oris);
}

const TABLES = new Map<CrossColor, Map<number, number>>();

export function crossDistanceTable(color: CrossColor = "white"): Map<number, number> {
  const cached = TABLES.get(color);
  if (cached) return cached;
  const pieces = CROSS_PIECES_BY_COLOR[color];
  const table = new Map<number, number>();
  const start = solvedCoord(pieces);
  table.set(start, 0);
  let frontier = [start];
  let dist = 0;
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const coord of frontier) {
      for (let m = 0; m < MOVES.length; m++) {
        const nc = applyMoveToCoord(coord, m);
        if (!table.has(nc)) {
          table.set(nc, dist + 1);
          next.push(nc);
        }
      }
    }
    frontier = next;
    dist++;
  }
  TABLES.set(color, table);
  return table;
}

export function optimalCrossLength(scramble: string, color: CrossColor = "white"): number {
  const table = crossDistanceTable(color);
  const pieces = CROSS_PIECES_BY_COLOR[color];
  const coord = coordOfState(applyScramble(solved(), scramble), pieces);
  return table.get(coord) ?? 0;
}

// One optimal cross solution for the given color, via greedy descent on the table.
export function solveCross(scramble: string, color: CrossColor = "white"): string {
  const table = crossDistanceTable(color);
  const pieces = CROSS_PIECES_BY_COLOR[color];
  let coord = coordOfState(applyScramble(solved(), scramble), pieces);
  let dist = table.get(coord) ?? 0;
  const moves: string[] = [];
  while (dist > 0) {
    for (let m = 0; m < MOVES.length; m++) {
      const nc = applyMoveToCoord(coord, m);
      if (table.get(nc) === dist - 1) {
        moves.push(MOVES[m].name);
        coord = nc;
        dist--;
        break;
      }
    }
  }
  return moves.join(" ");
}
