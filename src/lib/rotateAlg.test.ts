import { describe, it, expect } from "vitest";
import { rotateAlg } from "./facecube";

describe("rotateAlg", () => {
  it("is the identity for 0 and 4 quarter turns", () => {
    expect(rotateAlg("R U R'", 0)).toBe("R U R'");
    expect(rotateAlg("R U R'", 4)).toBe("R U R'");
  });

  it("y2 maps each side face to its opposite, keeping U/D and modifiers", () => {
    expect(rotateAlg("R2 F' U", 2)).toBe("L2 B' U");
    expect(rotateAlg("F", 2)).toBe("B");
    expect(rotateAlg("L D R", 2)).toBe("R D L");
  });

  it("composes: two single rotations equal one double", () => {
    expect(rotateAlg(rotateAlg("R U F'", 1), 1)).toBe(rotateAlg("R U F'", 2));
  });
});
