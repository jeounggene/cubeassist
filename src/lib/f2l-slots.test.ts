import { describe, it, expect } from "vitest";
import {
  F2L_CASES,
  SLOTS,
  slotAlgorithm,
  slotSetup,
  slotFacelets,
  slotDisturbable,
} from "./f2l";
import { solved, applyAlg } from "./facecube";

describe("F2L rotationless slots", () => {
  it("slotAlgorithm for FR equals the base algorithm", () => {
    for (const c of F2L_CASES) expect(slotAlgorithm(c, "FR")).toBe(c.algorithm);
  });

  it("every case in every slot disturbs only the top layer + that slot's pair", () => {
    const s = solved();
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) {
        const allowed = new Set(slotDisturbable(slot));
        const f = slotFacelets(c, slot);
        for (let i = 0; i < 54; i++) {
          if (!allowed.has(i) && f[i] !== s[i]) {
            throw new Error(`${c.id} slot ${slot} disturbs facelet ${i}`);
          }
        }
      }
    }
  });

  it("the slot algorithm solves its slot setup", () => {
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) {
        const after = applyAlg(applyAlg(solved(), slotSetup(c, slot)), slotAlgorithm(c, slot));
        expect(after).toEqual(solved());
      }
    }
  });

  it("slot algorithms are rotationless (only face moves)", () => {
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) {
        for (const tok of slotAlgorithm(c, slot).split(" ")) {
          expect(tok).toMatch(/^[UDLRFB]('|2)?$/);
        }
      }
    }
  });
});
