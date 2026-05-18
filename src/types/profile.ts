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

export type Settings = {
  inspection: boolean;
  useMs: boolean;
};

export type UserProfile = {
  schemaVersion: 1;
  times: Record<Stage, StageTime>;
  known: Record<ChecklistKey, Record<string, boolean>>;
  drillHistory: DrillRecord[];
  settings: Settings;
};

export const SAMPLE_WINDOW = 12;
export const STORAGE_KEY = "cubeassist:profile:v1";
