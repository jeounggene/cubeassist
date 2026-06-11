import { describe, it, expect } from "vitest";
import { F2L_CASES, SLOTS, pairFacelets, slotFacelets, slotDisturbable } from "./f2l";

describe("pairFacelets", () => {
  it("returns the 5 stickers of the slot's pair (3 corner + 2 edge)", () => {
    for (const slot of SLOTS) {
      const hl = pairFacelets(F2L_CASES[0], slot);
      expect(hl).toHaveLength(5);
    }
  });

  it("highlighted stickers are within the slot's disturbable set", () => {
    for (const c of F2L_CASES.slice(0, 5)) {
      for (const slot of SLOTS) {
        const allowed = new Set(slotDisturbable(slot));
        for (const i of pairFacelets(c, slot)) {
          expect(allowed.has(i)).toBe(true);
        }
      }
    }
  });

  it("highlighted stickers actually hold the pair's colors", () => {
    // FR pair = corner {R=1,F=2,D=3} + edge {1,2} -> only colors 1,2,3 appear.
    const f = slotFacelets(F2L_CASES[0], "FR");
    for (const i of pairFacelets(F2L_CASES[0], "FR")) {
      expect([1, 2, 3]).toContain(f[i]);
    }
  });
});
