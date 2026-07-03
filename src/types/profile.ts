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

// Persistent solve history for a timer event (e.g. "timer-3x3"), batched by day.
// `days` maps an ISO date to that day's solve times (chronological); `best` and
// `count` are all-time.
export type SolveLog = {
  days: Record<string, number[]>;
  best: number | null;
  count: number;
};

export type StageSplits = {
  cross: number;
  f2l: number;
  oll: number;
  pll: number;
};

// One smart-cube solve with auto-detected per-stage splits (all seconds).
export type SmartSolve = {
  date: string; // ISO "YYYY-MM-DD"
  total: number; // whole-solve time
  splits: StageSplits; // cross/f2l/oll/pll times; sum ≈ total
  moves: number; // quarter-turn count
  tps: number; // moves / total
};

export type UserProfile = {
  schemaVersion: 1;
  times: Record<Stage, StageTime>;
  known: Record<ChecklistKey, Record<string, boolean>>;
  // Cases the user is learning but not yet comfortable with. Parallel to `known`
  // and mutually exclusive with it. Optional + additive: older saves lack it.
  learning?: Record<ChecklistKey, Record<string, boolean>>;
  drillHistory: DrillRecord[];
  settings: Settings;
  // Optional + additive: profiles saved before the training plan won't have it,
  // so readers must default via getRegimen().
  regimen?: Regimen;
  // Persistent solve history keyed by timer event id. Optional + additive.
  solves?: Record<string, SolveLog>;
  // Auto-captured smart-cube solves with per-stage splits. Optional + additive.
  smartSolves?: SmartSolve[];
};

export const SAMPLE_WINDOW = 12;
export const SMART_SOLVE_CAP = 200;
export const STORAGE_KEY = "cubeassist:profile:v1";
