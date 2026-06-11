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

const FACE_NORMALS: Record<string, Vec> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

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

// Quarter-turn permutation for the face with outward normal n: perm[i] = index the
// facelet content at i moves to.
function quarterPerm(n: Vec): number[] {
  const perm = FACELETS.map((_, i) => i);
  for (let i = 0; i < FACELETS.length; i++) {
    const f = FACELETS[i];
    if (dot(f.pos, n) === 1) {
      const np = rot90(f.pos, n);
      const nn = rot90(f.normal, n);
      const j = INDEX_BY_KEY.get(key(np, nn));
      if (j === undefined) throw new Error("facelet match failed");
      perm[i] = j;
    }
  }
  return perm;
}

const QUARTER_BY_FACE: Record<string, number[]> = Object.fromEntries(
  Object.entries(FACE_NORMALS).map(([face, n]) => [face, quarterPerm(n)]),
);

export function solved(): Facelets {
  return Array.from({ length: 54 }, (_, i) => Math.floor(i / 9));
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
    const face = token[0];
    const perm = QUARTER_BY_FACE[face];
    if (!perm) throw new Error(`Unknown move: ${token}`);
    const times = token.endsWith("2") ? 2 : token.endsWith("'") ? 3 : 1;
    for (let t = 0; t < times; t++) cur = applyPerm(cur, perm);
  }
  return cur;
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
