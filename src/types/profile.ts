// src/types/profile.ts

export type Stage = "cross" | "f2l" | "oll" | "pll";
export type ChecklistKey = "f2l" | "oll2look" | "pll2look" | "oll" | "pll";

export type StageTime = {
  avg: number | null;
  samples: number[]; // last 12 entries, FIFO; seconds
};

export type DrillRecord = {
  date: string;    // ISO "YYYY-MM-DD"
  caseId: string;  // e.g., "PLL-T"
  attempts: number;
  avgTime: number;
};

export type Theme = "light" | "dark";

export type Settings = {
  inspection: boolean;
  useMs: boolean;
  theme: Theme;
};

// Daily-checklist progress for the training plan. `done` maps an ISO date to the
// ids of tasks completed that day; `streak` counts consecutive fully-completed
// days, `lastDone` is the most recent such day.
export type Regimen = {
  done: Record<string, string[]>;
  streak: number;
  lastDone: string | null;
};

export type UserProfile = {
  schemaVersion: 1;
  times: Record<Stage, StageTime>;
  known: Record<ChecklistKey, Record<string, boolean>>;
  drillHistory: DrillRecord[];
  settings: Settings;
  // Optional + additive: profiles saved before the training plan won't have it,
  // so readers must default via getRegimen().
  regimen?: Regimen;
};

export const SAMPLE_WINDOW = 12;
export const STORAGE_KEY = "cubeassist:profile:v1";
