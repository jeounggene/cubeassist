import { describe, it, expect } from "vitest";
import { buildPlan } from "./regimen";
import { emptyProfile } from "./profile";
import { OLL_CASES, PLL_CASES } from "./algset";
import f2lCases from "../data/cases/f2l.json";

const DAY = "2026-06-23";

describe("buildPlan", () => {
  it("always returns one task per area, in CFOP order", () => {
    const plan = buildPlan(emptyProfile(), DAY);
    expect(plan.map((t) => t.id)).toEqual(["cross", "f2l", "oll", "pll"]);
    plan.forEach((t) => expect(t.link).toMatch(/^\/(trainer|algorithms)/));
  });

  it("for a brand-new profile, every area is a learn/training task", () => {
    const plan = buildPlan(emptyProfile(), DAY);
    const byId = Object.fromEntries(plan.map((t) => [t.id, t]));
    expect(byId.cross.title).toMatch(/cross training/i);
    expect(byId.f2l.title).toMatch(/learn 2 new f2l/i);
    expect(byId.oll.title).toMatch(/learn 2 new oll/i);
    expect(byId.pll.title).toMatch(/learn 2 new pll/i);
    // Learn tasks link to the alg pages.
    expect(byId.oll.link).toBe("/algorithms/oll");
    expect(byId.pll.link).toBe("/algorithms/pll");
    expect(byId.f2l.link).toBe("/algorithms");
  });

  it("introduces OLL in shape order, not numeric order", () => {
    const p = emptyProfile();
    // Know the first four Dot cases (01-04); the next Dot case is 17, not 05.
    for (const id of ["OLL-01", "OLL-02", "OLL-03", "OLL-04"]) p.known.oll[id] = true;
    const oll = buildPlan(p, DAY).find((t) => t.id === "oll")!;
    expect(oll.detail).toMatch(/#17/);
    expect(oll.detail).not.toMatch(/#05/);
  });

  it("respects newPerDay", () => {
    const oll = buildPlan(emptyProfile(), DAY, 3).find((t) => t.id === "oll")!;
    // "next: #01, #02, #03 · 57 left"
    expect(oll.detail.match(/#\d\d/g)).toHaveLength(3);
  });

  it("switches an area to a drill task once everything in it is known", () => {
    const p = emptyProfile();
    OLL_CASES.forEach((c) => (p.known.oll[c.id] = true));
    PLL_CASES.forEach((c) => (p.known.pll[c.id] = true));
    (f2lCases as { id: string }[]).forEach((c) => (p.known.f2l[c.id] = true));
    p.times.cross = { avg: 1.4, samples: [1.4, 1.5, 1.3, 1.4, 1.5, 1.4] };

    const byId = Object.fromEntries(buildPlan(p, DAY).map((t) => [t.id, t]));
    expect(byId.cross.title).toMatch(/keep sharp/i);
    expect(byId.oll.link).toBe("/trainer?mode=algset");
    expect(byId.pll.link).toBe("/trainer?mode=pll");
    expect(byId.f2l.link).toBe("/trainer?mode=lookahead");
  });

  it("treats cross as weak when there are too few samples", () => {
    const p = emptyProfile();
    p.times.cross = { avg: 1.2, samples: [1.2, 1.1] }; // fast but only 2 solves
    const cross = buildPlan(p, DAY).find((t) => t.id === "cross")!;
    expect(cross.title).toMatch(/cross training/i);
  });
});
