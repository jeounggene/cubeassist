import casesData from "../data/cases/f2l.json";
import { solved, applyAlg, invertAlg, cubieFacelets, topLayerFacelets } from "./facecube";
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
