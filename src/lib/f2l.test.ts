import { describe, it, expect } from "vitest";
import { F2L_CASES, caseSetup, caseFacelets, slotAlgorithm, DISTURBABLE_FACELETS } from "./f2l";
import { solved, applyAlg, isF2LComplete } from "./facecube";

const allowed = new Set(DISTURBABLE_FACELETS);

describe("F2L data correctness", () => {
  it("has all 41 cases", () => {
    expect(F2L_CASES).toHaveLength(41);
  });

  it("every case's FR setup leaves only the FR slot + U face disturbed", () => {
    const s = solved();
    for (const c of F2L_CASES) {
      const f = caseFacelets(c);
      for (let i = 0; i < 54; i++) {
        if (!allowed.has(i) && f[i] !== s[i]) {
          throw new Error(`case ${c.id} disturbs facelet ${i}`);
        }
      }
    }
  });

  it("the favored FR algorithm completes F2L from its setup", () => {
    for (const c of F2L_CASES) {
      const after = applyAlg(applyAlg(solved(), caseSetup(c)), slotAlgorithm(c, "FR"));
      expect(isF2LComplete(after)).toBe(true);
    }
  });

  it("the FR pair is actually displaced (case differs from solved)", () => {
    for (const c of F2L_CASES) {
      expect(caseFacelets(c)).not.toEqual(solved());
    }
  });

  it("all authored cases are distinct", () => {
    const seen = new Map<string, string>();
    for (const c of F2L_CASES) {
      const k = caseFacelets(c).join("");
      const dup = seen.get(k);
      if (dup) throw new Error(`case ${c.id} duplicates ${dup}`);
      seen.set(k, c.id);
    }
  });
});
