// src/lib/profile.ts
import { STORAGE_KEY, SAMPLE_WINDOW, SMART_SOLVE_CAP } from "../types/profile";
import type {
  UserProfile,
  Stage,
  ChecklistKey,
  DrillRecord,
  Regimen,
  SolveLog,
  SmartSolve,
} from "../types/profile";

const STAGES: Stage[] = ["cross", "f2l", "oll", "pll"];
const CHECKLISTS: ChecklistKey[] = ["f2l", "oll2look", "pll2look", "oll", "pll"];

export type CaseStatus = "unknown" | "learning" | "known";

function emptyChecklists(): Record<ChecklistKey, Record<string, boolean>> {
  return Object.fromEntries(CHECKLISTS.map((k) => [k, {}])) as unknown as Record<
    ChecklistKey,
    Record<string, boolean>
  >;
}

export function emptyProfile(): UserProfile {
  return {
    schemaVersion: 1,
    times: Object.fromEntries(
      STAGES.map((s) => [s, { avg: null, samples: [] }]),
    ) as unknown as UserProfile["times"],
    known: emptyChecklists(),
    learning: emptyChecklists(),
    drillHistory: [],
    settings: { inspection: true, useMs: false, theme: "light" },
    regimen: { done: {}, streak: 0, lastDone: null },
    solves: {},
    smartSolves: [],
  };
}

export function getSmartSolves(profile: UserProfile): SmartSolve[] {
  return profile.smartSolves ?? [];
}

// Append a smart solve, keeping only the most recent SMART_SOLVE_CAP.
export function recordSmartSolve(
  profile: UserProfile,
  solve: SmartSolve,
): UserProfile {
  if (!(solve.total > 0) || !Number.isFinite(solve.total)) {
    throw new Error(`Invalid smart solve total: ${solve.total}`);
  }
  const next = [...getSmartSolves(profile), solve].slice(-SMART_SOLVE_CAP);
  return { ...profile, smartSolves: next };
}

export function getSolveLog(profile: UserProfile, eventId: string): SolveLog {
  const raw = profile.solves?.[eventId] as
    | (SolveLog & { times?: number[] })
    | undefined;
  if (!raw) return { days: {}, best: null, count: 0 };
  // Normalise logs saved before day-batching (a flat `times` array, no `days`),
  // so the day-grouped views can't crash. Old solves are kept under "earlier".
  if (!raw.days) {
    const legacy = raw.times ?? [];
    return {
      days: legacy.length ? { earlier: legacy } : {},
      best: raw.best ?? (legacy.length ? Math.min(...legacy) : null),
      count: raw.count ?? legacy.length,
    };
  }
  return raw;
}

// Append a solve to its day's batch, updating all-time best/count.
export function recordSolve(
  profile: UserProfile,
  eventId: string,
  seconds: number,
  date: string,
): UserProfile {
  if (!(seconds > 0) || !Number.isFinite(seconds)) {
    throw new Error(`Invalid solve time: ${seconds}`);
  }
  const prev = getSolveLog(profile, eventId);
  const best = prev.best == null ? seconds : Math.min(prev.best, seconds);
  return {
    ...profile,
    solves: {
      ...(profile.solves ?? {}),
      [eventId]: {
        days: { ...prev.days, [date]: [...(prev.days[date] ?? []), seconds] },
        best,
        count: prev.count + 1,
      },
    },
  };
}

// All solves flattened oldest-first (day order, then within-day order).
export function solveTimes(log: SolveLog): number[] {
  return Object.keys(log.days)
    .sort()
    .flatMap((d) => log.days[d]);
}

// Day keys, most recent first.
export function solveDays(log: SolveLog): string[] {
  return Object.keys(log.days).sort().reverse();
}

// Three-state status of a case: known (comfortable), learning (knows it but not
// solid), or unknown. `known` and `learning` are kept mutually exclusive.
export function caseStatus(
  profile: UserProfile,
  list: ChecklistKey,
  caseId: string,
): CaseStatus {
  if (profile.known[list]?.[caseId]) return "known";
  if (profile.learning?.[list]?.[caseId]) return "learning";
  return "unknown";
}

export function setCaseStatus(
  profile: UserProfile,
  list: ChecklistKey,
  caseId: string,
  status: CaseStatus,
): UserProfile {
  const learning = profile.learning ?? emptyChecklists();
  return {
    ...profile,
    known: {
      ...profile.known,
      [list]: { ...profile.known[list], [caseId]: status === "known" },
    },
    learning: {
      ...learning,
      [list]: { ...learning[list], [caseId]: status === "learning" },
    },
  };
}

export function getRegimen(profile: UserProfile): Regimen {
  return profile.regimen ?? { done: {}, streak: 0, lastDone: null };
}

// Previous calendar day for an ISO date, computed in UTC to avoid DST drift.
export function prevDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Check/uncheck a daily task. When every task for the day is checked for the
// first time, advance the streak (from yesterday) or restart it after a gap.
export function setTaskDone(
  profile: UserProfile,
  date: string,
  taskId: string,
  done: boolean,
  allTaskIds: string[],
): UserProfile {
  const reg = getRegimen(profile);
  const prev = reg.done[date] ?? [];
  const list = done
    ? prev.includes(taskId)
      ? prev
      : [...prev, taskId]
    : prev.filter((t) => t !== taskId);

  let { streak, lastDone } = reg;
  const allDone = allTaskIds.length > 0 && allTaskIds.every((t) => list.includes(t));
  if (allDone && lastDone !== date) {
    streak = lastDone === prevDay(date) ? streak + 1 : 1;
    lastDone = date;
  }

  return {
    ...profile,
    regimen: { done: { ...reg.done, [date]: list }, streak, lastDone },
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
