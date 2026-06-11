import casesData from "../data/cases/f2l.json";
import { solved, applyAlg, invertAlg, cubieFacelets, topLayerFacelets } from "./facecube";
import type { Facelets } from "./facecube";

// The four slots, reached from FR by 0..3 y rotations.
export type Slot = "FR" | "FL" | "BL" | "BR";
export const SLOTS: Slot[] = ["FR", "FL", "BL", "BR"];

export type F2LCase = {
  id: string;
  name: string;
  group: string;
  recognition: string;
  // Per slot, algorithms ordered with the favored (recommended) alg first.
  algs: Record<Slot, string[]>;
  // Per slot, a clean face-move algorithm used only to derive the setup + diagram
  // (so the setup never reorients even when the favored display alg uses wide moves).
  setup: Record<Slot, string>;
};

export const F2L_CASES: F2LCase[] = (casesData as Partial<F2LCase>[]).filter(
  (c): c is F2LCase => !!c.algs && !!c.setup && Array.isArray(c.algs.FR) && c.algs.FR.length > 0,
);

const SLOT_CUBIES: Record<Slot, { corner: [number, number, number]; edge: [number, number, number] }> = {
  FR: { corner: [1, -1, 1], edge: [1, 0, 1] },
  FL: { corner: [-1, -1, 1], edge: [-1, 0, 1] },
  BL: { corner: [-1, -1, -1], edge: [-1, 0, -1] },
  BR: { corner: [1, -1, -1], edge: [1, 0, -1] },
};

// All usable rotationless algorithms for solving the case into `slot` (best first).
export function slotAlgorithms(c: F2LCase, slot: Slot): string[] {
  return c.algs[slot];
}
// The favored (first-displayed) algorithm for the slot.
export function slotAlgorithm(c: F2LCase, slot: Slot): string {
  return c.algs[slot][0];
}
// The setup is derived from the clean face-move alg, not the (maybe wide) favored one.
export function slotSetup(c: F2LCase, slot: Slot): string {
  return invertAlg(c.setup[slot]);
}
export function caseSetup(c: F2LCase): string {
  return slotSetup(c, "FR");
}
export function caseFacelets(c: F2LCase): Facelets {
  return applyAlg(solved(), caseSetup(c));
}
export function slotFacelets(c: F2LCase, slot: Slot): Facelets {
  return applyAlg(solved(), slotSetup(c, slot));
}
export function slotDisturbable(slot: Slot): number[] {
  return [
    ...topLayerFacelets(),
    ...cubieFacelets(SLOT_CUBIES[slot].corner),
    ...cubieFacelets(SLOT_CUBIES[slot].edge),
  ];
}

// Color sets of each slot's pair: corner = its two side faces + D(3); edge = the
// two side faces. Faces: U=0 R=1 F=2 D=3 L=4 B=5.
const SLOT_COLORS: Record<Slot, { corner: number[]; edge: number[] }> = {
  FR: { corner: [1, 2, 3], edge: [1, 2] },
  FL: { corner: [2, 3, 4], edge: [2, 4] },
  BL: { corner: [3, 4, 5], edge: [4, 5] },
  BR: { corner: [1, 3, 5], edge: [1, 5] },
};

const CORNER_POSITIONS: [number, number, number][] = [];
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) CORNER_POSITIONS.push([x, y, z]);
const EDGE_POSITIONS: [number, number, number][] = [];
for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) {
  if ([a, b, c].filter((v) => v === 0).length === 1) EDGE_POSITIONS.push([a, b, c]);
}

const sortedEq = (a: number[], b: number[]) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

// Facelet indices currently showing the slot's pair pieces (to highlight in the
// diagram). Everything else in the case is irrelevant last-layer noise.
export function pairFacelets(c: F2LCase, slot: Slot): number[] {
  const f = slotFacelets(c, slot);
  const want = SLOT_COLORS[slot];
  const out: number[] = [];
  for (const pos of CORNER_POSITIONS) {
    const fl = cubieFacelets(pos);
    if (sortedEq(fl.map((i) => f[i]), want.corner)) out.push(...fl);
  }
  for (const pos of EDGE_POSITIONS) {
    const fl = cubieFacelets(pos);
    if (sortedEq(fl.map((i) => f[i]), want.edge)) out.push(...fl);
  }
  return out;
}

// Stickers a clean FR-slot case may disturb: the entire top (U) layer plus the
// FR pair (DFR corner + FR edge). Everything else must stay solved.
export const DISTURBABLE_FACELETS = [
  ...topLayerFacelets(),
  ...cubieFacelets([1, -1, 1]),
  ...cubieFacelets([1, 0, 1]),
];

export function f2lGroups(): string[] {
  return [...new Set(F2L_CASES.map((c) => c.group))];
}
