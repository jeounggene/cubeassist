// A facelet-free Rubik's cube model that tracks only the 12 edges.
// Slot order: 0 UF 1 UR 2 UB 3 UL 4 DF 5 DR 6 DB 7 DL 8 FR 9 FL 10 BR 11 BL

export type EdgeState = { perm: number[]; ori: number[] };

export type MoveSpec = {
  name: string; // e.g. "R", "R2", "R'"
  dest: number[]; // dest[s] = slot the piece at slot s moves to
  flip: boolean[]; // flip[s] = piece leaving slot s has its orientation flipped
};

const EDGE_COUNT = 12;

// Clockwise quarter-turn 4-cycles (viewed from outside the face) + flip flag.
const QUARTERS: { face: string; cycle: number[]; flip: boolean }[] = [
  { face: "U", cycle: [0, 3, 2, 1], flip: false },
  { face: "D", cycle: [4, 5, 6, 7], flip: false },
  { face: "R", cycle: [1, 10, 5, 8], flip: false },
  { face: "L", cycle: [3, 9, 7, 11], flip: false },
  { face: "F", cycle: [0, 8, 4, 9], flip: true },
  { face: "B", cycle: [2, 11, 6, 10], flip: true },
];

function identityPerm(): number[] {
  return Array.from({ length: EDGE_COUNT }, (_, i) => i);
}

function composePerm(first: number[], second: number[]): number[] {
  // apply `first`, then `second`: result[s] = second[first[s]]
  return first.map((_, s) => second[first[s]]);
}

function invertPerm(p: number[]): number[] {
  const inv = new Array<number>(EDGE_COUNT);
  for (let s = 0; s < EDGE_COUNT; s++) inv[p[s]] = s;
  return inv;
}

function quarterDest(cycle: number[]): number[] {
  const dest = identityPerm();
  const [a, b, c, d] = cycle;
  dest[a] = b;
  dest[b] = c;
  dest[c] = d;
  dest[d] = a;
  return dest;
}

function buildMoves(): MoveSpec[] {
  const moves: MoveSpec[] = [];
  for (const q of QUARTERS) {
    const dest1 = quarterDest(q.cycle);
    const flip1 = new Array<boolean>(EDGE_COUNT).fill(false);
    if (q.flip) for (const s of q.cycle) flip1[s] = true;

    // quarter
    moves.push({ name: q.face, dest: dest1, flip: flip1 });
    // double: two quarters; orientation flips cancel
    moves.push({
      name: `${q.face}2`,
      dest: composePerm(dest1, dest1),
      flip: new Array<boolean>(EDGE_COUNT).fill(false),
    });
    // prime: inverse quarter; same slots flip once (odd)
    moves.push({ name: `${q.face}'`, dest: invertPerm(dest1), flip: flip1.slice() });
  }
  return moves;
}

export const MOVES: MoveSpec[] = buildMoves();

const MOVE_BY_NAME = new Map<string, MoveSpec>(MOVES.map((m) => [m.name, m]));

export function solved(): EdgeState {
  return { perm: identityPerm(), ori: new Array<number>(EDGE_COUNT).fill(0) };
}

export function applyMoveSpec(state: EdgeState, spec: MoveSpec): EdgeState {
  const perm = new Array<number>(EDGE_COUNT);
  const ori = new Array<number>(EDGE_COUNT);
  for (let s = 0; s < EDGE_COUNT; s++) {
    const to = spec.dest[s];
    perm[to] = state.perm[s];
    ori[to] = spec.flip[s] ? state.ori[s] ^ 1 : state.ori[s];
  }
  return { perm, ori };
}

export function applyScramble(state: EdgeState, scramble: string): EdgeState {
  let cur = state;
  for (const token of scramble.trim().split(/\s+/)) {
    if (!token) continue;
    const spec = MOVE_BY_NAME.get(token);
    if (!spec) throw new Error(`Unknown move: ${token}`);
    cur = applyMoveSpec(cur, spec);
  }
  return cur;
}

export function invertScramble(scramble: string): string {
  const tokens = scramble.trim().split(/\s+/).filter(Boolean);
  const invertToken = (t: string): string => {
    if (t.endsWith("2")) return t;
    if (t.endsWith("'")) return t.slice(0, -1);
    return `${t}'`;
  };
  return tokens.reverse().map(invertToken).join(" ");
}
