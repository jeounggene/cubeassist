// src/lib/profile.ts
import { STORAGE_KEY, SAMPLE_WINDOW } from "../types/profile";
import type { UserProfile, Stage, ChecklistKey, DrillRecord } from "../types/profile";

const STAGES: Stage[] = ["cross", "f2l", "oll", "pll"];
const CHECKLISTS: ChecklistKey[] = ["f2l", "oll2look", "pll2look", "oll", "pll"];

export function emptyProfile(): UserProfile {
  return {
    schemaVersion: 1,
    times: Object.fromEntries(
      STAGES.map((s) => [s, { avg: null, samples: [] }]),
    ) as unknown as UserProfile["times"],
    known: Object.fromEntries(CHECKLISTS.map((k) => [k, {}])) as unknown as UserProfile["known"],
    drillHistory: [],
    settings: { inspection: true, useMs: false },
  };
}

export function loadProfile(): UserProfile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProfile();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== 1) return emptyProfile();
    return parsed as UserProfile;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function appendTimeSample(
  profile: UserProfile,
  stage: Stage,
  seconds: number,
): UserProfile {
  if (!(seconds > 0) || !Number.isFinite(seconds)) {
    throw new Error(`Invalid sample: ${seconds}`);
  }
  const prev = profile.times[stage].samples;
  const samples = [...prev, seconds].slice(-SAMPLE_WINDOW);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return {
    ...profile,
    times: {
      ...profile.times,
      [stage]: { samples, avg },
    },
  };
}

export function setKnown(
  profile: UserProfile,
  checklist: ChecklistKey,
  caseId: string,
  value: boolean,
): UserProfile {
  return {
    ...profile,
    known: {
      ...profile.known,
      [checklist]: { ...profile.known[checklist], [caseId]: value },
    },
  };
}

export function appendDrillRecord(
  profile: UserProfile,
  record: DrillRecord,
): UserProfile {
  return { ...profile, drillHistory: [...profile.drillHistory, record] };
}
