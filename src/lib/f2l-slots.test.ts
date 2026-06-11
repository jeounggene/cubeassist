import { describe, it, expect } from "vitest";
import { F2L_CASES, SLOTS, slotAlgorithms, slotSetup, slotDisturbable } from "./f2l";
import { solved, applyAlg, invertAlg, isF2LComplete } from "./facecube";

describe("F2L rotationless slots", () => {
  it("every slot has at least one algorithm", () => {
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) expect(slotAlgorithms(c, slot).length).toBeGreaterThan(0);
    }
  });

  it("each slot's setup alg is a clean face-move alg (drives the setup/diagram)", () => {
    const s = solved();
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) {
        const setupAlg = c.setup[slot];
        for (const tok of setupAlg.split(" ")) expect(tok).toMatch(/^[UDLRFB]('|2)?$/);
        const allowed = new Set(slotDisturbable(slot));
        const f = applyAlg(s, invertAlg(setupAlg));
        for (let i = 0; i < 54; i++) {
          if (!allowed.has(i) && f[i] !== s[i]) {
            throw new Error(`${c.id} ${slot} setup disturbs facelet ${i}`);
          }
        }
      }
    }
  });

  it("every listed algorithm completes F2L from the slot's setup", () => {
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) {
        const setupState = applyAlg(solved(), slotSetup(c, slot));
        for (const alg of slotAlgorithms(c, slot)) {
          if (!isF2LComplete(applyAlg(setupState, alg))) {
            throw new Error(`${c.id} ${slot} "${alg}" does not complete F2L`);
          }
        }
      }
    }
  });
});
