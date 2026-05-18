// src/lib/profile.ts
import {
  UserProfile,
  Stage,
  ChecklistKey,
  STORAGE_KEY,
} from "../types/profile";

const STAGES: Stage[] = ["cross", "f2l", "oll", "pll"];
const CHECKLISTS: ChecklistKey[] = ["f2l", "oll2look", "pll2look", "oll", "pll"];

export function emptyProfile(): UserProfile {
  return {
    schemaVersion: 1,
    times: Object.fromEntries(
      STAGES.map((s) => [s, { avg: null, samples: [] }]),
    ) as UserProfile["times"],
    known: Object.fromEntries(CHECKLISTS.map((k) => [k, {}])) as UserProfile["known"],
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
