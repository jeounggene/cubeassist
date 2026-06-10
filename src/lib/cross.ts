import { MOVES, solved, applyScramble } from "./cube";
import type { EdgeState } from "./cube";

// Pieces whose home slots form the white (D-layer) cross.
const CROSS_PIECES = [4, 5, 6, 7];

// Pack the 4 cross pieces' (slot, ori) into a single integer: 5 bits each.
function packCoord(slots: number[], oris: number[]): number {
  let coord = 0;
  for (let i = 0; i < 4; i++) {
    const val = (slots[i] << 1) | oris[i]; // slot 0..11, ori 0..1
    coord |= val << (5 * i);
  }
  return coord;
}

function coordOfState(state: EdgeState): number {
  const slots: number[] = [];
  const oris: number[] = [];
  for (const p of CROSS_PIECES) {
    const slot = state.perm.indexOf(p);
    slots.push(slot);
    oris.push(state.ori[slot]);
  }
  return packCoord(slots, oris);
}

const SOLVED_COORD = packCoord(CROSS_PIECES, [0, 0, 0, 0]);

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

let TABLE: Map<number, number> | null = null;

export function crossDistanceTable(): Map<number, number> {
  if (TABLE) return TABLE;
  const table = new Map<number, number>();
  table.set(SOLVED_COORD, 0);
  let frontier = [SOLVED_COORD];
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
  TABLE = table;
  return table;
}

export function optimalCrossLength(scramble: string): number {
  const table = crossDistanceTable();
  const coord = coordOfState(applyScramble(solved(), scramble));
  return table.get(coord) ?? 0;
}

// One optimal cross solution, reconstructed by greedy descent on the table.
export function solveCross(scramble: string): string {
  const table = crossDistanceTable();
  let coord = coordOfState(applyScramble(solved(), scramble));
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
