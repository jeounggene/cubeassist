import casesData from "../data/cases/f2l.json";
import {
  solved,
  applyAlg,
  invertAlg,
  rotateAlg,
  cubieFacelets,
  topLayerFacelets,
} from "./facecube";
import type { Facelets } from "./facecube";

export type F2LCase = {
  id: string;
  name: string;
  group: string;
  algorithm: string;
  recognition: string;
};

// Only cases that have an authored algorithm are drillable. Un-enriched entries
// (still `{ id, name }`) are skipped here but remain in the Profile checklist.
export const F2L_CASES: F2LCase[] = (casesData as Partial<F2LCase>[])
  .filter((c): c is F2LCase => typeof c.algorithm === "string" && c.algorithm.length > 0);

export function caseSetup(c: F2LCase): string {
  return invertAlg(c.algorithm);
}

export function caseFacelets(c: F2LCase): Facelets {
  return applyAlg(solved(), caseSetup(c));
}

// The four slots, reached from FR by 0..3 y rotations of the maneuver.
export type Slot = "FR" | "FL" | "BL" | "BR";
export const SLOTS: Slot[] = ["FR", "FL", "BL", "BR"];
const SLOT_ROT: Record<Slot, number> = { FR: 0, FL: 1, BL: 2, BR: 3 };
const SLOT_CUBIES: Record<Slot, { corner: [number, number, number]; edge: [number, number, number] }> = {
  FR: { corner: [1, -1, 1], edge: [1, 0, 1] },
  FL: { corner: [-1, -1, 1], edge: [-1, 0, 1] },
  BL: { corner: [-1, -1, -1], edge: [-1, 0, -1] },
  BR: { corner: [1, -1, -1], edge: [1, 0, -1] },
};

// Rotationless algorithm that solves case `c`'s pair into `slot` without rotating.
export function slotAlgorithm(c: F2LCase, slot: Slot): string {
  return rotateAlg(c.algorithm, SLOT_ROT[slot]);
}
export function slotSetup(c: F2LCase, slot: Slot): string {
  return invertAlg(slotAlgorithm(c, slot));
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
