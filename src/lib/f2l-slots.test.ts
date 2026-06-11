import { describe, it, expect } from "vitest";
import { F2L_CASES, SLOTS, slotAlgorithms, slotDisturbable } from "./f2l";
import { solved, applyAlg, invertAlg } from "./facecube";

describe("F2L rotationless slots", () => {
  it("every slot has at least one usable algorithm", () => {
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) expect(slotAlgorithms(c, slot).length).toBeGreaterThan(0);
    }
  });

  it("every algorithm (all alternatives) cleanly solves its slot without rotations", () => {
    const s = solved();
    for (const c of F2L_CASES) {
      for (const slot of SLOTS) {
        const allowed = new Set(slotDisturbable(slot));
        for (const alg of slotAlgorithms(c, slot)) {
          // rotationless: only face moves
          for (const tok of alg.split(" ")) expect(tok).toMatch(/^[UDLRFB]('|2)?$/);
          // setup (inverse) disturbs only this slot's pair + the top layer
          const f = applyAlg(s, invertAlg(alg));
          for (let i = 0; i < 54; i++) {
            if (!allowed.has(i) && f[i] !== s[i]) {
              throw new Error(`${c.id} ${slot} "${alg}" disturbs facelet ${i}`);
            }
          }
          // and the alg actually solves that setup
          expect(applyAlg(f, alg)).toEqual(s);
        }
      }
    }
  });
});
