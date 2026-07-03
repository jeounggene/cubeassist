// src/lib/profile.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadProfile, saveProfile, emptyProfile } from "./profile";
import { getSmartSolves, recordSmartSolve } from "./profile";
import { STORAGE_KEY, SMART_SOLVE_CAP } from "../types/profile";
import type { SmartSolve } from "../types/profile";

beforeEach(() => {
  localStorage.clear();
});

describe("loadProfile / saveProfile", () => {
  it("returns an empty profile when localStorage is empty", () => {
    const p = loadProfile();
    expect(p.schemaVersion).toBe(1);
    expect(p.times.cross.avg).toBeNull();
    expect(p.times.cross.samples).toEqual([]);
    expect(p.known.pll).toEqual({});
    expect(p.drillHistory).toEqual([]);
    expect(p.settings.inspection).toBe(true);
  });

  it("round-trips a saved profile", () => {
    const p = emptyProfile();
    p.times.pll.avg = 3.2;
    p.times.pll.samples = [3.0, 3.4];
    p.known.pll = { "PLL-T": true };
    saveProfile(p);

    const reloaded = loadProfile();
    expect(reloaded.times.pll.avg).toBe(3.2);
    expect(reloaded.times.pll.samples).toEqual([3.0, 3.4]);
    expect(reloaded.known.pll["PLL-T"]).toBe(true);
  });

  it("recovers from corrupt JSON by returning an empty profile", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    const p = loadProfile();
    expect(p.schemaVersion).toBe(1);
    expect(p.times.cross.samples).toEqual([]);
  });

  it("recovers from a missing schemaVersion by returning an empty profile", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    const p = loadProfile();
    expect(p.schemaVersion).toBe(1);
  });
});

import { appendTimeSample } from "./profile";

describe("appendTimeSample", () => {
  it("appends a sample and recomputes avg", () => {
    let p = emptyProfile();
    p = appendTimeSample(p, "pll", 3.0);
    p = appendTimeSample(p, "pll", 4.0);
    expect(p.times.pll.samples).toEqual([3.0, 4.0]);
    expect(p.times.pll.avg).toBeCloseTo(3.5);
  });

  it("keeps only the last 12 samples (FIFO)", () => {
    let p = emptyProfile();
    for (let i = 1; i <= 15; i++) {
      p = appendTimeSample(p, "cross", i);
    }
    expect(p.times.cross.samples).toHaveLength(12);
    expect(p.times.cross.samples[0]).toBe(4);   // dropped 1, 2, 3
    expect(p.times.cross.samples[11]).toBe(15);
    // avg of 4..15 = (4+15)*12/2 / 12 = 9.5
    expect(p.times.cross.avg).toBeCloseTo(9.5);
  });

  it("rejects non-positive samples", () => {
    const p = emptyProfile();
    expect(() => appendTimeSample(p, "pll", 0)).toThrow();
    expect(() => appendTimeSample(p, "pll", -1)).toThrow();
  });

  it("does not mutate the input profile", () => {
    const p = emptyProfile();
    const out = appendTimeSample(p, "pll", 3.0);
    expect(p.times.pll.samples).toEqual([]);
    expect(out).not.toBe(p);
  });
});

import { setKnown } from "./profile";

describe("setKnown", () => {
  it("marks an algorithm as known", () => {
    const p = setKnown(emptyProfile(), "pll", "PLL-T", true);
    expect(p.known.pll["PLL-T"]).toBe(true);
  });

  it("clears a previously-known algorithm when value is false", () => {
    let p = setKnown(emptyProfile(), "oll", "OLL-27", true);
    p = setKnown(p, "oll", "OLL-27", false);
    expect(p.known.oll["OLL-27"]).toBe(false);
  });

  it("does not mutate the input profile", () => {
    const p = emptyProfile();
    const out = setKnown(p, "pll", "PLL-T", true);
    expect(p.known.pll["PLL-T"]).toBeUndefined();
    expect(out).not.toBe(p);
  });
});

import { getRegimen, prevDay, setTaskDone } from "./profile";

describe("prevDay", () => {
  it("returns the previous calendar day", () => {
    expect(prevDay("2026-06-23")).toBe("2026-06-22");
    expect(prevDay("2026-03-01")).toBe("2026-02-28");
    expect(prevDay("2026-01-01")).toBe("2025-12-31");
  });
});

describe("getRegimen", () => {
  it("defaults for a profile saved before the regimen existed", () => {
    const p = emptyProfile();
    delete p.regimen;
    expect(getRegimen(p)).toEqual({ done: {}, streak: 0, lastDone: null });
  });
});

describe("setTaskDone", () => {
  const DAY = "2026-06-23";
  const TASKS = ["cross", "f2l", "oll", "pll"];

  it("records a completed task for the day without mutating input", () => {
    const p = emptyProfile();
    const out = setTaskDone(p, DAY, "oll", true, TASKS);
    expect(getRegimen(out).done[DAY]).toEqual(["oll"]);
    expect(getRegimen(p).done[DAY]).toBeUndefined();
  });

  it("removes a task when unchecked", () => {
    let p = setTaskDone(emptyProfile(), DAY, "oll", true, TASKS);
    p = setTaskDone(p, DAY, "oll", false, TASKS);
    expect(getRegimen(p).done[DAY] ?? []).toEqual([]);
  });

  it("starts a streak at 1 when the day is first fully completed", () => {
    let p = emptyProfile();
    for (const t of TASKS) p = setTaskDone(p, DAY, t, true, TASKS);
    expect(getRegimen(p).streak).toBe(1);
    expect(getRegimen(p).lastDone).toBe(DAY);
  });

  it("extends the streak when yesterday was completed", () => {
    let p = emptyProfile();
    p.regimen = { done: {}, streak: 3, lastDone: prevDay(DAY) };
    for (const t of TASKS) p = setTaskDone(p, DAY, t, true, TASKS);
    expect(getRegimen(p).streak).toBe(4);
  });

  it("resets the streak to 1 after a gap", () => {
    let p = emptyProfile();
    p.regimen = { done: {}, streak: 5, lastDone: "2026-06-20" }; // 3 days earlier
    for (const t of TASKS) p = setTaskDone(p, DAY, t, true, TASKS);
    expect(getRegimen(p).streak).toBe(1);
  });

  it("does not double-count the streak if the same day completes again", () => {
    let p = emptyProfile();
    for (const t of TASKS) p = setTaskDone(p, DAY, t, true, TASKS);
    // toggle one off and on again
    p = setTaskDone(p, DAY, "pll", false, TASKS);
    p = setTaskDone(p, DAY, "pll", true, TASKS);
    expect(getRegimen(p).streak).toBe(1);
  });
});

import { caseStatus, setCaseStatus } from "./profile";

describe("case status (unknown / learning / known)", () => {
  it("defaults to unknown", () => {
    expect(caseStatus(emptyProfile(), "oll", "OLL-01")).toBe("unknown");
  });

  it("sets a case to learning and back to unknown", () => {
    let p = setCaseStatus(emptyProfile(), "oll", "OLL-01", "learning");
    expect(caseStatus(p, "oll", "OLL-01")).toBe("learning");
    p = setCaseStatus(p, "oll", "OLL-01", "unknown");
    expect(caseStatus(p, "oll", "OLL-01")).toBe("unknown");
  });

  it("known and learning are mutually exclusive", () => {
    let p = setCaseStatus(emptyProfile(), "pll", "PLL-T", "learning");
    p = setCaseStatus(p, "pll", "PLL-T", "known");
    expect(caseStatus(p, "pll", "PLL-T")).toBe("known");
    expect(p.known.pll["PLL-T"]).toBe(true);
    expect(p.learning?.pll["PLL-T"]).toBe(false);
  });

  it("reads learning for a profile saved before the field existed", () => {
    const p = emptyProfile();
    delete p.learning;
    expect(caseStatus(p, "f2l", "f2l-01")).toBe("unknown");
    const out = setCaseStatus(p, "f2l", "f2l-01", "learning");
    expect(caseStatus(out, "f2l", "f2l-01")).toBe("learning");
  });

  it("does not mutate the input profile", () => {
    const p = emptyProfile();
    const out = setCaseStatus(p, "oll", "OLL-01", "learning");
    expect(caseStatus(p, "oll", "OLL-01")).toBe("unknown");
    expect(out).not.toBe(p);
  });
});

import { getSolveLog, recordSolve, solveTimes, solveDays } from "./profile";

describe("solve log (batched by day)", () => {
  it("defaults to an empty log", () => {
    expect(getSolveLog(emptyProfile(), "timer-3x3")).toEqual({
      days: {},
      best: null,
      count: 0,
    });
  });

  it("groups solves under their day and tracks all-time best/count", () => {
    let p = recordSolve(emptyProfile(), "timer-3x3", 12.5, "2026-06-22");
    p = recordSolve(p, "timer-3x3", 9.8, "2026-06-23");
    p = recordSolve(p, "timer-3x3", 11.0, "2026-06-23");
    const log = getSolveLog(p, "timer-3x3");
    expect(log.days).toEqual({ "2026-06-22": [12.5], "2026-06-23": [9.8, 11.0] });
    expect(log.best).toBe(9.8);
    expect(log.count).toBe(3);
  });

  it("flattens solves chronologically and lists days newest-first", () => {
    let p = recordSolve(emptyProfile(), "e", 5, "2026-06-22");
    p = recordSolve(p, "e", 6, "2026-06-23");
    p = recordSolve(p, "e", 4, "2026-06-22");
    const log = getSolveLog(p, "e");
    expect(solveTimes(log)).toEqual([5, 4, 6]); // day order, then within-day order
    expect(solveDays(log)).toEqual(["2026-06-23", "2026-06-22"]);
  });

  it("normalises a legacy flat-times log so the day views never crash", () => {
    const p = emptyProfile();
    // A profile saved before day-batching: a flat `times` array, no `days`.
    (p.solves as Record<string, unknown>)["timer-3x3"] = {
      times: [10, 8, 9],
      best: 8,
      count: 3,
    };
    const log = getSolveLog(p, "timer-3x3");
    expect(() => solveDays(log)).not.toThrow();
    expect(() => solveTimes(log)).not.toThrow();
    expect(log.count).toBe(3);
    expect(log.best).toBe(8);
    expect(solveTimes(log)).toEqual([10, 8, 9]); // preserved, not lost
  });

  it("keeps events separate", () => {
    let p = recordSolve(emptyProfile(), "timer-3x3", 10, "2026-06-23");
    p = recordSolve(p, "timer-ru", 4, "2026-06-23");
    expect(getSolveLog(p, "timer-3x3").count).toBe(1);
    expect(getSolveLog(p, "timer-ru").best).toBe(4);
  });

  it("rejects invalid solve times and does not mutate input", () => {
    const p = emptyProfile();
    expect(() => recordSolve(p, "e", 0, "2026-06-23")).toThrow();
    expect(() => recordSolve(p, "e", -1, "2026-06-23")).toThrow();
    const out = recordSolve(p, "e", 5, "2026-06-23");
    expect(getSolveLog(p, "e").count).toBe(0);
    expect(out).not.toBe(p);
  });
});

import { appendDrillRecord } from "./profile";
import type { DrillRecord } from "../types/profile";

describe("appendDrillRecord", () => {
  const rec: DrillRecord = {
    date: "2026-06-10",
    caseId: "cross",
    attempts: 5,
    avgTime: 3.2,
  };

  it("appends a record to drillHistory", () => {
    const p = appendDrillRecord(emptyProfile(), rec);
    expect(p.drillHistory).toHaveLength(1);
    expect(p.drillHistory[0]).toEqual(rec);
  });

  it("does not mutate the input profile", () => {
    const p = emptyProfile();
    const out = appendDrillRecord(p, rec);
    expect(p.drillHistory).toHaveLength(0);
    expect(out).not.toBe(p);
  });
});

describe("smart solves", () => {
  const solve = (total: number): SmartSolve => ({
    date: "2026-07-02",
    total,
    splits: { cross: 1, f2l: total - 4, oll: 1.5, pll: 1.5 },
    moves: 50,
    tps: 50 / total,
  });

  it("defaults to empty for a profile without smartSolves", () => {
    expect(getSmartSolves(emptyProfile())).toEqual([]);
  });

  it("appends newest last", () => {
    let p = emptyProfile();
    p = recordSmartSolve(p, solve(20));
    p = recordSmartSolve(p, solve(18));
    expect(getSmartSolves(p).map((s) => s.total)).toEqual([20, 18]);
  });

  it("caps at SMART_SOLVE_CAP, dropping oldest", () => {
    let p = emptyProfile();
    for (let i = 0; i < SMART_SOLVE_CAP + 5; i++) p = recordSmartSolve(p, solve(10 + i));
    const solves = getSmartSolves(p);
    expect(solves.length).toBe(SMART_SOLVE_CAP);
    expect(solves[0].total).toBe(15); // first 5 dropped
  });

  it("rejects a non-finite total", () => {
    expect(() => recordSmartSolve(emptyProfile(), solve(NaN))).toThrow();
  });

  it("loads a legacy profile object with no smartSolves key", () => {
    const legacy = { ...emptyProfile() };
    delete (legacy as { smartSolves?: unknown }).smartSolves;
    expect(getSmartSolves(legacy)).toEqual([]);
  });
});
