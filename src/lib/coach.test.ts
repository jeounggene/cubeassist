import { describe, it, expect } from "vitest";
import { heuristicCoach } from "./coach";
import type { SmartSolve } from "../types/profile";

const KNOWN_ROUTES = new Set([
  "/trainer?mode=cross",
  "/trainer?mode=lookahead",
  "/trainer?mode=algset",
  "/trainer?mode=pll",
  "/algorithms/oll",
  "/algorithms/pll",
  "/plan",
]);

const solve = (splits: SmartSolve["splits"]): SmartSolve => {
  const total = splits.cross + splits.f2l + splits.oll + splits.pll;
  return { date: "2026-07-02", total, splits, moves: 55, tps: 55 / total };
};

describe("heuristicCoach", () => {
  it("asks for more solves when there are too few", () => {
    const r = heuristicCoach.analyze({ solves: [solve({ cross: 1, f2l: 8, oll: 2, pll: 2 })] });
    expect(r.insights).toHaveLength(1);
    expect(r.insights[0].severity).toBe("info");
    expect(r.insights[0].id).toBe("warmup");
  });

  it("flags F2L as the focus when it dominates well above benchmark", () => {
    // total 18 → sub-20 bracket (F2L target 9s); F2L at 12s is the clear bottleneck.
    const solves = Array.from({ length: 5 }, () =>
      solve({ cross: 1.5, f2l: 12, oll: 2.5, pll: 2 }),
    );
    const r = heuristicCoach.analyze({ solves });
    const focus = r.insights.find((i) => i.severity === "focus");
    expect(focus?.area).toBe("f2l");
    expect(focus?.action?.to).toBe("/trainer?mode=lookahead");
  });

  it("only emits insights whose action links to a real route", () => {
    const solves = Array.from({ length: 8 }, (_, i) =>
      solve({ cross: 1 + (i % 2), f2l: 9, oll: 4, pll: 3 }),
    );
    const r = heuristicCoach.analyze({ solves });
    for (const ins of r.insights) {
      if (ins.action) expect(KNOWN_ROUTES.has(ins.action.to)).toBe(true);
    }
    expect(r.insights.length).toBeGreaterThan(0);
  });
});
