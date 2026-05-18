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
