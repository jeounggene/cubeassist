// A 54-facelet Rubik's cube model. Each facelet holds a color id 0..5.
// Faces in order U R F D L B, 9 facelets each, row-major (Kociemba layout):
//   U 0..8   R 9..17   F 18..26   D 27..35   L 36..44   B 45..53
// Move permutations are derived geometrically (rotate each face facelet's
// position + outward normal by a clockwise quarter turn, then re-match), so
// no facelet cycles are hand-authored. Validated by R^4 = I and sexy^6 = I.

export type Facelets = number[];

type Vec = [number, number, number];

// Per-face layout: outward normal + the in-plane row/col axes. cell(r,c) sits at
// normal + rowAxis*(r-1) + colAxis*(c-1), giving coords in {-1,0,1}^3.
const FACE_DEFS: { normal: Vec; rowAxis: Vec; colAxis: Vec }[] = [
  { normal: [0, 1, 0], rowAxis: [0, 0, 1], colAxis: [1, 0, 0] }, // U
  { normal: [1, 0, 0], rowAxis: [0, -1, 0], colAxis: [0, 0, -1] }, // R
  { normal: [0, 0, 1], rowAxis: [0, -1, 0], colAxis: [1, 0, 0] }, // F
  { normal: [0, -1, 0], rowAxis: [0, 0, -1], colAxis: [1, 0, 0] }, // D
  { normal: [-1, 0, 0], rowAxis: [0, -1, 0], colAxis: [0, 0, 1] }, // L
  { normal: [0, 0, -1], rowAxis: [0, -1, 0], colAxis: [-1, 0, 0] }, // B
];

type Facelet = { pos: Vec; normal: Vec };

function buildFacelets(): Facelet[] {
  const facelets: Facelet[] = [];
  for (const def of FACE_DEFS) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const pos: Vec = [
          def.normal[0] + def.rowAxis[0] * (r - 1) + def.colAxis[0] * (c - 1),
          def.normal[1] + def.rowAxis[1] * (r - 1) + def.colAxis[1] * (c - 1),
          def.normal[2] + def.rowAxis[2] * (r - 1) + def.colAxis[2] * (c - 1),
        ];
        facelets.push({ pos, normal: def.normal });
      }
    }
  }
  return facelets;
}

const FACELETS = buildFacelets();

const key = (pos: Vec, normal: Vec) => `${pos.join(",")}|${normal.join(",")}`;

const INDEX_BY_KEY = new Map<string, number>(
  FACELETS.map((f, i) => [key(f.pos, f.normal), i]),
);

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Rotate v by -90 degrees about unit axis k (clockwise viewed from +k toward origin):
// v' = k*(k·v) - (k×v)
function rot90(v: Vec, k: Vec): Vec {
  const kd = dot(k, v);
  const cross: Vec = [
    k[1] * v[2] - k[2] * v[1],
    k[2] * v[0] - k[0] * v[2],
    k[0] * v[1] - k[1] * v[0],
  ];
  return [k[0] * kd - cross[0], k[1] * kd - cross[1], k[2] * kd - cross[2]];
}

// A move rotates the layers whose coordinate along `axis` is in `values`, about
// `dir` (clockwise viewed from +dir). Covers faces, wide turns, slices, rotations.
const X: Vec = [1, 0, 0];
const Y: Vec = [0, 1, 0];
const Z: Vec = [0, 0, 1];
const MOVE_SPECS: Record<string, { axis: Vec; values: number[]; dir: Vec }> = {
  R: { axis: X, values: [1], dir: [1, 0, 0] },
  L: { axis: X, values: [-1], dir: [-1, 0, 0] },
  U: { axis: Y, values: [1], dir: [0, 1, 0] },
  D: { axis: Y, values: [-1], dir: [0, -1, 0] },
  F: { axis: Z, values: [1], dir: [0, 0, 1] },
  B: { axis: Z, values: [-1], dir: [0, 0, -1] },
  r: { axis: X, values: [0, 1], dir: [1, 0, 0] },
  l: { axis: X, values: [-1, 0], dir: [-1, 0, 0] },
  u: { axis: Y, values: [0, 1], dir: [0, 1, 0] },
  d: { axis: Y, values: [-1, 0], dir: [0, -1, 0] },
  f: { axis: Z, values: [0, 1], dir: [0, 0, 1] },
  b: { axis: Z, values: [-1, 0], dir: [0, 0, -1] },
  M: { axis: X, values: [0], dir: [-1, 0, 0] },
  E: { axis: Y, values: [0], dir: [0, -1, 0] },
  S: { axis: Z, values: [0], dir: [0, 0, 1] },
  x: { axis: X, values: [-1, 0, 1], dir: [1, 0, 0] },
  y: { axis: Y, values: [-1, 0, 1], dir: [0, 1, 0] },
  z: { axis: Z, values: [-1, 0, 1], dir: [0, 0, 1] },
};

function layerPerm(spec: { axis: Vec; values: number[]; dir: Vec }): number[] {
  const perm = FACELETS.map((_, i) => i);
  for (let i = 0; i < FACELETS.length; i++) {
    const f = FACELETS[i];
    if (spec.values.includes(dot(f.pos, spec.axis))) {
      const j = INDEX_BY_KEY.get(key(rot90(f.pos, spec.dir), rot90(f.normal, spec.dir)));
      if (j === undefined) throw new Error("facelet match failed");
      perm[i] = j;
    }
  }
  return perm;
}

const MOVE_PERM: Record<string, number[]> = Object.fromEntries(
  Object.entries(MOVE_SPECS).map(([name, spec]) => [name, layerPerm(spec)]),
);

// Parse a move token into its base perm name and turn count (1, 2, or 3).
function parseToken(token: string): { name: string; times: number } {
  let name: string;
  let mod: string;
  if (token.length >= 2 && token[1] === "w") {
    name = token[0].toLowerCase(); // Rw -> r
    mod = token.slice(2);
  } else {
    name = token[0];
    mod = token.slice(1);
  }
  const times = mod === "2" ? 2 : mod === "'" ? 3 : 1;
  return { name, times };
}

export function solved(): Facelets {
  return Array.from({ length: 54 }, (_, i) => Math.floor(i / 9));
}

// Whole-cube y rotation as a facelet permutation (same y as rotateAlg).
function buildYStatePerm(): number[] {
  const k: Vec = [0, 1, 0];
  const perm = new Array<number>(54);
  for (let i = 0; i < FACELETS.length; i++) {
    const j = INDEX_BY_KEY.get(key(rot90(FACELETS[i].pos, k), rot90(FACELETS[i].normal, k)));
    if (j === undefined) throw new Error("y rotation match failed");
    perm[i] = j;
  }
  return perm;
}
const Y_STATE_PERM = buildYStatePerm();

// Rotate the whole cube `q` quarter y-turns (colors move with the cube).
export function rotateState(facelets: Facelets, q: number): Facelets {
  const n = ((q % 4) + 4) % 4;
  let cur = facelets;
  for (let t = 0; t < n; t++) {
    const next = new Array<number>(54);
    for (let i = 0; i < 54; i++) next[Y_STATE_PERM[i]] = cur[i];
    cur = next;
  }
  return cur;
}

// Facelet indices belonging to the cubie centered at `pos` (e.g. [1,-1,1] = DFR
// corner, [1,0,1] = FR edge). Used to identify which stickers a case may disturb.
export function cubieFacelets(pos: [number, number, number]): number[] {
  const out: number[] = [];
  for (let i = 0; i < FACELETS.length; i++) {
    const p = FACELETS[i].pos;
    if (p[0] === pos[0] && p[1] === pos[1] && p[2] === pos[2]) out.push(i);
  }
  return out;
}

// Facelet indices in the top (U) layer — every sticker on a cubie with y = +1.
// These include the U face plus the top row of each side face.
export function topLayerFacelets(): number[] {
  const out: number[] = [];
  for (let i = 0; i < FACELETS.length; i++) {
    if (FACELETS[i].pos[1] === 1) out.push(i);
  }
  return out;
}

function applyPerm(state: Facelets, perm: number[]): Facelets {
  const next = new Array<number>(54);
  for (let i = 0; i < 54; i++) next[perm[i]] = state[i];
  return next;
}

export function applyAlg(state: Facelets, alg: string): Facelets {
  let cur = state;
  for (const token of alg.trim().split(/\s+/)) {
    if (!token) continue;
    const { name, times } = parseToken(token);
    const perm = MOVE_PERM[name];
    if (!perm) throw new Error(`Unknown move: ${token}`);
    for (let t = 0; t < times; t++) cur = applyPerm(cur, perm);
  }
  return cur;
}

// The 24 whole-cube orientations as facelet permutations (generated by x and y).
function buildOrientationPerms(): number[][] {
  const compose = (a: number[], b: number[]) => a.map((_, i) => b[a[i]]);
  const id = FACELETS.map((_, i) => i);
  const seen = new Map<string, number[]>([[id.join(","), id]]);
  let frontier = [id];
  while (frontier.length) {
    const next: number[][] = [];
    for (const p of frontier) {
      for (const g of [MOVE_PERM.x, MOVE_PERM.y]) {
        const np = compose(p, g);
        const k = np.join(",");
        if (!seen.has(k)) {
          seen.set(k, np);
          next.push(np);
        }
      }
    }
    frontier = next;
  }
  return [...seen.values()];
}
const ORIENTATION_PERMS = buildOrientationPerms();

const CENTERS = [4, 13, 22, 31, 40, 49]; // U R F D L B centers
const isStandardOriented = (s: Facelets) => CENTERS.every((c, i) => s[c] === i);

// Rotate the whole cube into standard orientation (U yellow on top, green front,
// etc.). Returns the same state when wide moves / rotations left it tilted.
export function normalizeOrientation(state: Facelets): Facelets {
  for (const p of ORIENTATION_PERMS) {
    const cand = applyPerm(state, p);
    if (isStandardOriented(cand)) return cand;
  }
  return state;
}

// True if `state` is solved up to a whole-cube rotation.
export function isSolvedUpToRotation(state: Facelets): boolean {
  const s = solved();
  return normalizeOrientation(state).every((v, i) => v === s[i]);
}

const NON_TOP = Array.from({ length: 54 }, (_, i) => i).filter((i) => FACELETS[i].pos[1] !== 1);

// True if the first two layers are solved (the U/last layer may be anything),
// up to a whole-cube rotation. This is what an F2L algorithm must achieve.
export function isF2LComplete(state: Facelets): boolean {
  const s = solved();
  const n = normalizeOrientation(state);
  return NON_TOP.every((i) => n[i] === s[i]);
}

// Relabel an algorithm's faces by `quarterTurns` y rotations (rotate the whole
// maneuver, no rotation moves emitted). Used to express an FR-slot alg for the
// other slots rotationlessly. One y: F->L, L->B, B->R, R->F; U/D fixed.
const Y_MAP: Record<string, string> = {
  U: "U", D: "D", F: "L", L: "B", B: "R", R: "F",
  u: "u", d: "d", f: "l", l: "b", b: "r", r: "f",
  E: "E", y: "y", // y-axis slice/rotation are fixed under y
};

// Relabeling under y is only valid for algs that don't use x/z axis slices or
// rotations (M, S, x, z), which y would remap non-trivially.
export function relabelableUnderY(alg: string): boolean {
  return !/[MSxz]/.test(alg);
}

export function rotateAlg(alg: string, quarterTurns: number): string {
  const q = ((quarterTurns % 4) + 4) % 4;
  const relabelOnce = (a: string) =>
    a
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((tok) => (Y_MAP[tok[0]] ?? tok[0]) + tok.slice(1))
      .join(" ");
  let out = alg.trim();
  for (let i = 0; i < q; i++) out = relabelOnce(out);
  return out;
}

export function invertAlg(alg: string): string {
  const tokens = alg.trim().split(/\s+/).filter(Boolean);
  const invertToken = (t: string): string => {
    if (t.endsWith("2")) return t;
    if (t.endsWith("'")) return t.slice(0, -1);
    return `${t}'`;
  };
  return tokens.reverse().map(invertToken).join(" ");
}
