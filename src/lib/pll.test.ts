import { describe, it, expect } from "vitest";
import { pllShortName, pllLetter, PLL_GROUPS, PLL_NAMES, PLL_LETTERS, AUFS } from "./pll";
import pllCases from "../data/cases/pll.json";

describe("pllShortName", () => {
  it("strips the 'PLL' prefix and 'perm' suffix", () => {
    expect(pllShortName("PLL Aa perm")).toBe("Aa");
    expect(pllShortName("PLL E perm")).toBe("E");
    expect(pllShortName("PLL Z perm")).toBe("Z");
  });
});

describe("PLL board", () => {
  it("has all 21 unique PLLs, flattened from the groups", () => {
    expect(PLL_NAMES).toHaveLength(21);
    expect(new Set(PLL_NAMES).size).toBe(21);
    expect(PLL_GROUPS.flat()).toEqual(PLL_NAMES);
  });

  it("matches the short names of every case in pll.json (no drift)", () => {
    const fromData = (pllCases as { name: string }[]).map((c) => pllShortName(c.name));
    expect([...PLL_NAMES].sort()).toEqual([...fromData].sort());
  });
});

describe("pllLetter", () => {
  it("drops the a/b/c/d variant suffix to leave the family letter", () => {
    expect(pllLetter("Aa")).toBe("A");
    expect(pllLetter("Gd")).toBe("G");
    expect(pllLetter("Ub")).toBe("U");
  });

  it("leaves single-letter PLLs unchanged", () => {
    expect(pllLetter("E")).toBe("E");
    expect(pllLetter("Z")).toBe("Z");
  });
});

describe("PLL_LETTERS", () => {
  it("is the 13 unique families, one per group", () => {
    expect(PLL_LETTERS).toEqual(["A", "E", "F", "G", "H", "J", "N", "R", "T", "U", "V", "Y", "Z"]);
    expect(PLL_LETTERS).toHaveLength(PLL_GROUPS.length);
  });

  it("covers the family of every PLL name", () => {
    for (const name of PLL_NAMES) {
      expect(PLL_LETTERS).toContain(pllLetter(name));
    }
  });
});

describe("AUFS", () => {
  it("offers the four recognition angles", () => {
    expect(AUFS).toEqual(["", "U", "U2", "U'"]);
  });
});
