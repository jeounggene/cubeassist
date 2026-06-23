import { describe, it, expect } from "vitest";
import { segmentAlg } from "./triggers";

describe("segmentAlg", () => {
  it("labels the sexy move", () => {
    expect(segmentAlg("R U R' U'")).toEqual([
      { text: "R U R' U'", name: "Sexy move", cat: "sexy" },
    ]);
  });

  it("labels the sledgehammer", () => {
    expect(segmentAlg("R' F R F'")[0]).toMatchObject({ name: "Sledgehammer", cat: "sledge" });
  });

  it("splits Sune into inserts around a U", () => {
    const s = segmentAlg("R U R' U R U2 R'");
    expect(s.map((x) => x.text)).toEqual(["R U R'", "U", "R U2 R'"]);
    expect(s[0]).toMatchObject({ name: "Insert", cat: "insert" });
    expect(s[2]).toMatchObject({ name: "Insert", cat: "insert" });
  });

  it("finds the sexy move inside an F (...) F' alg", () => {
    const s = segmentAlg("F R U R' U' F'");
    expect(s.map((x) => x.text)).toEqual(["F", "R U R' U'", "F'"]);
    expect(s[1]).toMatchObject({ cat: "sexy" });
  });

  it("omits insert labels when inserts are disabled (OLL/PLL)", () => {
    const s = segmentAlg("R U R' U R U2 R'", { inserts: false });
    expect(s.some((x) => x.cat === "insert")).toBe(false);
    expect(s.map((x) => x.text).join(" ")).toBe("R U R' U R U2 R'");
  });

  it("still labels sexy moves when inserts are disabled", () => {
    const s = segmentAlg("R U R' U'", { inserts: false });
    expect(s[0]).toMatchObject({ cat: "sexy" });
  });

  it("preserves the full algorithm text", () => {
    for (const alg of ["R U R' U R U2 R'", "F R U R' U' F'", "x R' U R' D2 R U' R' D2 R2 x'"]) {
      expect(segmentAlg(alg).map((x) => x.text).join(" ")).toBe(alg);
    }
  });
});
