import { describe, it, expect } from "vitest";
import { invertAlg } from "./facecube";
import {
  OLL_CASES,
  PLL_CASES,
  ALL_CASES,
  OLL_GROUPS,
  scrambleForCase,
  caseShort,
} from "./algset";

describe("alg case lists", () => {
  it("combines all 57 OLL and 21 PLL cases, each tagged and with algs", () => {
    expect(OLL_CASES).toHaveLength(57);
    expect(PLL_CASES).toHaveLength(21);
    expect(ALL_CASES).toHaveLength(78);
    expect(OLL_CASES.every((c) => c.kind === "oll" && c.algs.length > 0)).toBe(true);
    expect(PLL_CASES.every((c) => c.kind === "pll" && c.algs.length > 0)).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(ALL_CASES.map((c) => c.id)).size).toBe(78);
  });
});

describe("scrambleForCase", () => {
  it("is the inverse of the alg, so it sets up the case from solved", () => {
    expect(scrambleForCase("R U R' U'", "")).toBe(invertAlg("R U R' U'"));
  });

  it("appends the AUF when given", () => {
    expect(scrambleForCase("R U R'", "U2")).toBe(`${invertAlg("R U R'")} U2`);
  });

  it("does not leave a trailing space when the AUF is empty", () => {
    expect(scrambleForCase("R U R'", "")).not.toMatch(/\s$/);
  });
});

describe("OLL_GROUPS (shape grouping)", () => {
  it("partitions all 57 OLL cases into shapes, each exactly once", () => {
    const ids = OLL_GROUPS.flatMap((g) => g.cases.map((c) => c.id));
    expect(ids).toHaveLength(57);
    expect(new Set(ids)).toEqual(new Set(OLL_CASES.map((c) => c.id)));
  });

  it("places the known landmark cases in the right shape", () => {
    const shapeOf = (id: string) =>
      OLL_GROUPS.find((g) => g.cases.some((c) => c.id === id))?.shape;
    expect(shapeOf("OLL-05")).toBe("Square");
    expect(shapeOf("OLL-09")).toBe("Fish");
    expect(shapeOf("OLL-13")).toBe("Knight Move");
    expect(shapeOf("OLL-21")).toBe("OCLL");
    expect(shapeOf("OLL-28")).toBe("OCLL");
    expect(shapeOf("OLL-57")).toBe("OCLL");
  });
});

describe("caseShort", () => {
  it("shortens OLL and PLL names", () => {
    expect(caseShort("OLL 01")).toBe("#01");
    expect(caseShort("PLL Aa perm")).toBe("Aa");
    expect(caseShort("PLL Z perm")).toBe("Z");
  });
});
