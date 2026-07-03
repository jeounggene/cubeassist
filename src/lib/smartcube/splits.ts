import { solved, applyAlg, faceletGeometry } from "../facecube";
import type { Facelets } from "../facecube";
import type { StageSplits } from "../../types/profile";

export type SplitResult = {
  splits: StageSplits;
  total: number;
  moves: number;
  tps: number;
};

type FaceKey = "U" | "D" | "R" | "L" | "F" | "B";

const FACE_AXIS: Record<FaceKey, { axis: 0 | 1 | 2; val: 1 | -1 }> = {
  U: { axis: 1, val: 1 },
  D: { axis: 1, val: -1 },
  R: { axis: 0, val: 1 },
  L: { axis: 0, val: -1 },
  F: { axis: 2, val: 1 },
  B: { axis: 2, val: -1 },
};
const FACES = Object.keys(FACE_AXIS) as FaceKey[];

const REF = solved();
const GEO = faceletGeometry(); // per-facelet { pos, normal } in {-1,0,1}^3

const zeros = (p: readonly number[]) => p.filter((c) => c === 0).length;

type FaceSets = { cross: number[][]; f2l: number[]; topFace: number[]; topCenter: number };

function buildSets(face: FaceKey): FaceSets {
  const { axis, val } = FACE_AXIS[face];

  // Cross edge cubies on the down face: edge cubies (one zero coord) with pos[axis]===val.
  const byCubie = new Map<string, number[]>();
  GEO.forEach((g, i) => {
    if (g.pos[axis] === val && zeros(g.pos) === 1) {
      const k = g.pos.join(",");
      byCubie.set(k, [...(byCubie.get(k) ?? []), i]);
    }
  });
  const cross = [...byCubie.values()];

  // First two layers: every facelet whose cubie is not in the top layer.
  const f2l = GEO.map((_, i) => i).filter((i) => GEO[i].pos[axis] !== -val);

  // The opposite (top) face's 9 stickers, and its center.
  const topFace = GEO.map((_, i) => i).filter((i) => GEO[i].normal[axis] === -val);
  const topCenter = topFace.find((i) => zeros(GEO[i].pos) === 2)!;

  return { cross, f2l, topFace, topCenter };
}

const SETS: Record<FaceKey, FaceSets> = Object.fromEntries(
  FACES.map((f) => [f, buildSets(f)]),
) as Record<FaceKey, FaceSets>;

export function crossSolved(state: Facelets, face: FaceKey): boolean {
  return SETS[face].cross.every((cubie) => cubie.every((i) => state[i] === REF[i]));
}

export function f2lComplete(state: Facelets, face: FaceKey): boolean {
  return SETS[face].f2l.every((i) => state[i] === REF[i]);
}

export function ollComplete(state: Facelets, face: FaceKey): boolean {
  if (!f2lComplete(state, face)) return false;
  const c = state[SETS[face].topCenter];
  return SETS[face].topFace.every((i) => state[i] === c);
}

export function fullySolved(state: Facelets): boolean {
  return state.every((v, i) => v === REF[i]);
}

function firstIndex(states: Facelets[], pred: (s: Facelets) => boolean, from = 0): number {
  for (let i = from; i < states.length; i++) if (pred(states[i])) return i;
  return -1;
}

type Candidate = { face: FaceKey; cross: number; f2l: number; oll: number; solvedIdx: number };

export function detectSplits(
  start: Facelets,
  moves: { token: string; t: number }[],
): SplitResult | null {
  const states: Facelets[] = [start];
  let cur = start;
  for (const m of moves) {
    cur = applyAlg(cur, m.token);
    states.push(cur);
  }
  const T = [0, ...moves.map((m) => m.t)]; // T[0] = solve start; T[i] = time after move i

  let best: Candidate | null = null;
  for (const face of FACES) {
    const cross = firstIndex(states, (s) => crossSolved(s, face));
    if (cross < 0) continue;
    const f2l = firstIndex(states, (s) => f2lComplete(s, face), cross);
    if (f2l < 0) continue;
    const oll = firstIndex(states, (s) => ollComplete(s, face), f2l);
    if (oll < 0) continue;
    const solvedIdx = firstIndex(states, fullySolved, oll);
    if (solvedIdx < 0) continue;
    const cand: Candidate = { face, cross, f2l, oll, solvedIdx };
    // Real bottom finishes F2L earliest; break ties on the earliest cross.
    if (!best || cand.f2l < best.f2l || (cand.f2l === best.f2l && cand.cross < best.cross)) {
      best = cand;
    }
  }
  if (!best) return null;

  const sec = (a: number, b: number) => (T[a] - T[b]) / 1000;
  const splits: StageSplits = {
    cross: sec(best.cross, 0),
    f2l: sec(best.f2l, best.cross),
    oll: sec(best.oll, best.f2l),
    pll: sec(best.solvedIdx, best.oll),
  };
  const total = sec(best.solvedIdx, 0);
  return { splits, total, moves: moves.length, tps: total > 0 ? moves.length / total : 0 };
}
