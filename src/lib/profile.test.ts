// src/lib/profile.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadProfile, saveProfile, emptyProfile } from "./profile";
import { STORAGE_KEY } from "../types/profile";

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
