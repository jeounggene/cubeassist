import { describe, it, expect } from "vitest";
import { mul, conjugate, toMatrix3d } from "./quaternion";

const I = { x: 0, y: 0, z: 0, w: 1 };

describe("quaternion", () => {
  it("multiplies by identity", () => {
    const q = { x: 0.5, y: 0.5, z: 0.5, w: 0.5 };
    expect(mul(I, q)).toEqual(q);
  });

  it("conjugates", () => {
    expect(conjugate({ x: 1, y: 2, z: 3, w: 4 })).toEqual({ x: -1, y: -2, z: -3, w: 4 });
  });

  it("maps identity to the identity matrix3d", () => {
    expect(toMatrix3d(I)).toBe("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)");
  });

  it("maps a 180° turn about Y to a known matrix", () => {
    // q = (0,1,0,0): rotate 180° about Y → diag(-1,1,-1)
    expect(toMatrix3d({ x: 0, y: 1, z: 0, w: 0 })).toBe(
      "matrix3d(-1,0,0,0,0,1,0,0,0,0,-1,0,0,0,0,1)",
    );
  });
});
