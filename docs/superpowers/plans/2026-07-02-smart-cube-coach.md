# Smart Cube AI Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a smart-cube-only AI coach that auto-captures per-stage splits (cross/F2L/OLL/PLL) from a Bluetooth cube's move stream, feeds them into the profile, and gives prioritized coaching.

**Architecture:** Four pure/independently-testable layers — a `SmartCube` driver interface (with a deterministic `SimulatorCube`), a pure split detector folding the move stream onto the existing `facecube` model, a pure `heuristicCoach` behind a `CoachProvider` seam, and a gated `/coach` UI. Smart solves also call the existing `appendTimeSample` so the current training plan reflects real cube data.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, Vitest + Testing Library. Reuses `src/lib/facecube.ts` (cube model), `src/lib/scramble.ts`, `src/lib/profile.ts`.

## Global Constraints

- **Zero new runtime dependencies** for Tasks 1–6. The only dependency-adding work (`gan-web-bluetooth`) is Task 7 and is BLOCKED pending explicit user OK.
- **Additive, optional profile fields only** — never break loading of an older `localStorage` profile (follow the existing `regimen?` / `solves?` pattern; readers default via a getter).
- **Pure logic in `src/lib`, no React imports there.** UI lives in `src/components` / `src/pages`.
- **Time unit:** move timestamps are milliseconds; all persisted splits/totals are **seconds** (number).
- **Guard invalid times** the same way existing code does: `if (!(x > 0) || !Number.isFinite(x)) throw`.
- Run tests with `npx vitest run <path>`. Typecheck with `npm run typecheck`.
- Commit after each task with the shown message.

---

### Task 1: Profile schema + `recordSmartSolve`

**Files:**
- Modify: `src/types/profile.ts`
- Modify: `src/lib/profile.ts`
- Modify: `src/state/ProfileProvider.tsx`
- Test: `src/lib/profile.test.ts`

**Interfaces:**
- Produces:
  - `type StageSplits = { cross: number; f2l: number; oll: number; pll: number }` (seconds)
  - `type SmartSolve = { date: string; total: number; splits: StageSplits; moves: number; tps: number }`
  - `UserProfile.smartSolves?: SmartSolve[]` (newest last, capped)
  - `SMART_SOLVE_CAP = 200`
  - `getSmartSolves(profile: UserProfile): SmartSolve[]`
  - `recordSmartSolve(profile: UserProfile, solve: SmartSolve): UserProfile`
  - `ProfileProvider` value gains `recordSmartSolve(solve: SmartSolve): void`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/profile.test.ts`:

```ts
import { getSmartSolves, recordSmartSolve } from "./profile";
import { emptyProfile } from "./profile";
import { SMART_SOLVE_CAP } from "../types/profile";
import type { SmartSolve } from "../types/profile";

const solve = (total: number): SmartSolve => ({
  date: "2026-07-02",
  total,
  splits: { cross: 1, f2l: total - 4, oll: 1.5, pll: 1.5 },
  moves: 50,
  tps: 50 / total,
});

describe("smart solves", () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/profile.test.ts`
Expected: FAIL — `getSmartSolves`/`recordSmartSolve`/`SMART_SOLVE_CAP` not exported.

- [ ] **Step 3: Add types to `src/types/profile.ts`**

After the `SolveLog` type, add:

```ts
export type StageSplits = {
  cross: number;
  f2l: number;
  oll: number;
  pll: number;
};

// One smart-cube solve with auto-detected per-stage splits (all seconds).
export type SmartSolve = {
  date: string;        // ISO "YYYY-MM-DD"
  total: number;       // whole-solve time
  splits: StageSplits; // cross/f2l/oll/pll times; sum ≈ total
  moves: number;       // quarter-turn count
  tps: number;         // moves / total
};
```

In `UserProfile`, after `solves?`, add:

```ts
  // Auto-captured smart-cube solves with per-stage splits. Optional + additive.
  smartSolves?: SmartSolve[];
```

At the bottom near `SAMPLE_WINDOW`, add:

```ts
export const SMART_SOLVE_CAP = 200;
```

- [ ] **Step 4: Implement in `src/lib/profile.ts`**

Update imports at the top:

```ts
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
```

In `emptyProfile()`, add `smartSolves: []` to the returned object (after `solves: {}`).

Add these functions (near `getSolveLog`/`recordSolve`):

```ts
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
```

- [ ] **Step 5: Expose it on the provider `src/state/ProfileProvider.tsx`**

Add `recordSmartSolve` to the imports from `../lib/profile`, alias the existing solve importer to avoid a name clash. Since `recordSolve` is already imported, import the new one too:

```ts
import {
  appendDrillRecord,
  appendTimeSample,
  emptyProfile,
  loadProfile,
  saveProfile,
  setKnown,
  setCaseStatus,
  setTaskDone,
  recordSolve,
  recordSmartSolve as recordSmartSolveLib,
} from "../lib/profile";
import type { SmartSolve } from "../types/profile";
```

Add to `ProfileContextValue`:

```ts
  recordSmartSolve: (solve: SmartSolve) => void;
```

Add to the `value` object:

```ts
      recordSmartSolve: (solve) =>
        setProfile((p) => recordSmartSolveLib(p, solve)),
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run src/lib/profile.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/profile.ts src/lib/profile.ts src/state/ProfileProvider.tsx src/lib/profile.test.ts
git commit -m "feat(coach): smart-solve profile schema + recordSmartSolve"
```

---

### Task 2: `SmartCube` interface + `SimulatorCube`

**Files:**
- Create: `src/lib/smartcube/smartcube.ts`
- Create: `src/lib/smartcube/simulator.ts`
- Test: `src/lib/smartcube/simulator.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Face = "U"|"D"|"L"|"R"|"F"|"B"`
  - `type CubeMove = { face: Face; dir: 1 | -1; t: number }`
  - `interface SmartCube { readonly brand: string; readonly connected: boolean; connect(): Promise<void>; disconnect(): Promise<void>; onMove(cb: (m: CubeMove) => void): () => void; onDisconnect(cb: () => void): () => void }`
  - `moveToken(m: CubeMove): string`
  - `class SimulatorCube implements SmartCube` with extra `emit(m: CubeMove): void` and `feed(moves: CubeMove[]): void`

- [ ] **Step 1: Write the failing test**

Create `src/lib/smartcube/simulator.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { moveToken } from "./smartcube";
import type { CubeMove } from "./smartcube";
import { SimulatorCube } from "./simulator";

const mv = (face: CubeMove["face"], dir: 1 | -1, t: number): CubeMove => ({ face, dir, t });

describe("moveToken", () => {
  it("maps clockwise to a bare face and CCW to prime", () => {
    expect(moveToken(mv("R", 1, 0))).toBe("R");
    expect(moveToken(mv("U", -1, 0))).toBe("U'");
  });
});

describe("SimulatorCube", () => {
  it("connects, emits moves to subscribers, and unsubscribes", async () => {
    const cube = new SimulatorCube();
    await cube.connect();
    expect(cube.connected).toBe(true);

    const seen: string[] = [];
    const unsub = cube.onMove((m) => seen.push(moveToken(m)));
    cube.feed([mv("R", 1, 100), mv("U", -1, 200)]);
    expect(seen).toEqual(["R", "U'"]);

    unsub();
    cube.emit(mv("F", 1, 300));
    expect(seen).toEqual(["R", "U'"]); // no longer receiving

    const onDisc = vi.fn();
    cube.onDisconnect(onDisc);
    await cube.disconnect();
    expect(cube.connected).toBe(false);
    expect(onDisc).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/smartcube/simulator.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/lib/smartcube/smartcube.ts`**

```ts
// A minimal driver-agnostic smart-cube interface. A "move" is one quarter turn
// with a timestamp in ms (cube hardware clock if available, else performance.now()).

export type Face = "U" | "D" | "L" | "R" | "F" | "B";
export type CubeMove = { face: Face; dir: 1 | -1; t: number };

export interface SmartCube {
  readonly brand: string;
  readonly connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMove(cb: (m: CubeMove) => void): () => void; // returns unsubscribe
  onDisconnect(cb: () => void): () => void; // returns unsubscribe
}

// A CubeMove as a token facecube.applyAlg understands: "R", "U'", etc.
export function moveToken(m: CubeMove): string {
  return m.dir === -1 ? `${m.face}'` : m.face;
}
```

- [ ] **Step 4: Implement `src/lib/smartcube/simulator.ts`**

```ts
import type { CubeMove, SmartCube } from "./smartcube";

// A deterministic in-memory SmartCube for tests and keyboard-driven dev use.
// Timestamps are supplied by the caller so nothing here reads the clock.
export class SimulatorCube implements SmartCube {
  readonly brand = "simulator";
  private _connected = false;
  private moveCbs = new Set<(m: CubeMove) => void>();
  private discCbs = new Set<() => void>();

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.discCbs.forEach((cb) => cb());
  }

  onMove(cb: (m: CubeMove) => void): () => void {
    this.moveCbs.add(cb);
    return () => this.moveCbs.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.discCbs.add(cb);
    return () => this.discCbs.delete(cb);
  }

  // Test/dev helpers, not part of SmartCube.
  emit(m: CubeMove): void {
    this.moveCbs.forEach((cb) => cb(m));
  }

  feed(moves: CubeMove[]): void {
    moves.forEach((m) => this.emit(m));
  }
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/lib/smartcube/simulator.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/smartcube/smartcube.ts src/lib/smartcube/simulator.ts src/lib/smartcube/simulator.test.ts
git commit -m "feat(coach): SmartCube interface + SimulatorCube driver"
```

---

### Task 3: Split detection

**Files:**
- Create: `src/lib/smartcube/splits.ts`
- Test: `src/lib/smartcube/splits.test.ts`

**Interfaces:**
- Consumes: `facecube.ts` exports `solved`, `applyAlg`, `faceletGeometry`; `StageSplits` from `../../types/profile`.
- Produces:
  - `type SplitResult = { splits: StageSplits; total: number; moves: number; tps: number }`
  - `detectSplits(start: Facelets, moves: { token: string; t: number }[]): SplitResult | null`
  - (internal, exported for tests) `crossSolved`, `f2lComplete`, `ollComplete`, `fullySolved` taking `(state: Facelets, face: FaceKey)` / `(state)`.

**Design note (why this is correct):** The move stream is in the cube's fixed body frame, so we detect stages color-neutrally: for each of the 6 possible down-faces we test cross→F2L→OLL→solved using first-completion indices, then pick the down-face that finishes F2L earliest (the real bottom). Each predicate compares facelets to the solved reference `REF = solved()`, which is true exactly when the relevant pieces are home and oriented. Index sets are derived from `faceletGeometry()` so there is no hand-authored indexing.

- [ ] **Step 1: Write the failing test**

Create `src/lib/smartcube/splits.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { solved, applyAlg } from "../facecube";
import { detectSplits, crossSolved, f2lComplete, ollComplete, fullySolved } from "./splits";

const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'";
const SUNE = "R U R' U R U2 R'";

// Turn an alg string into timestamped solve moves: each quarter turn 100ms apart.
function moveStream(alg: string): { token: string; t: number }[] {
  const tokens = alg.trim().split(/\s+/).filter(Boolean);
  // expand doubles/primes into single quarter tokens so t maps to real turns
  const quarters: string[] = [];
  for (const tok of tokens) {
    const face = tok[0];
    if (tok.endsWith("2")) quarters.push(face, face);
    else quarters.push(tok);
  }
  return quarters.map((token, i) => ({ token, t: (i + 1) * 100 }));
}

describe("stage predicates", () => {
  it("recognise a solved cube on the D face", () => {
    const s = solved();
    expect(crossSolved(s, "D")).toBe(true);
    expect(f2lComplete(s, "D")).toBe(true);
    expect(ollComplete(s, "D")).toBe(true);
    expect(fullySolved(s)).toBe(true);
  });

  it("a U turn keeps F2L + OLL complete but not solved", () => {
    const s = applyAlg(solved(), "U");
    expect(f2lComplete(s, "D")).toBe(true);
    expect(ollComplete(s, "D")).toBe(true);
    expect(fullySolved(s)).toBe(false);
  });

  it("an R turn breaks F2L", () => {
    const s = applyAlg(solved(), "R");
    expect(f2lComplete(s, "D")).toBe(false);
  });

  it("Sune leaves F2L complete but OLL not oriented", () => {
    const s = applyAlg(solved(), SUNE);
    expect(f2lComplete(s, "D")).toBe(true);
    expect(ollComplete(s, "D")).toBe(false);
  });
});

describe("detectSplits", () => {
  it("returns null when the cube never reaches solved", () => {
    const start = applyAlg(solved(), "R U R'");
    const moves = moveStream("U R"); // does not solve
    expect(detectSplits(start, moves)).toBeNull();
  });

  it("splits a PLL-only solve: cross/f2l/oll are 0, pll is the whole time", () => {
    // Start already F2L+OLL solved (only permutation wrong); solve is the T-perm.
    const start = applyAlg(solved(), T_PERM);
    const moves = moveStream(T_PERM); // T-perm is its own inverse → returns to solved
    const res = detectSplits(start, moves)!;
    expect(res).not.toBeNull();
    expect(res.splits.cross).toBe(0);
    expect(res.splits.f2l).toBe(0);
    expect(res.splits.oll).toBe(0);
    expect(res.splits.pll).toBeCloseTo(res.total, 5);
    expect(res.total).toBeCloseTo(moves[moves.length - 1].t / 1000, 5);
    expect(res.moves).toBe(moves.length);
  });

  it("produces non-negative splits that sum to total for a last-layer solve", () => {
    const start = applyAlg(solved(), `${SUNE} ${T_PERM}`);
    const moves = moveStream(`${T_PERM} ${SUNE}`); // undo in reverse order → solved
    const res = detectSplits(start, moves)!;
    expect(res).not.toBeNull();
    const { cross, f2l, oll, pll } = res.splits;
    for (const v of [cross, f2l, oll, pll]) expect(v).toBeGreaterThanOrEqual(0);
    expect(cross + f2l + oll + pll).toBeCloseTo(res.total, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/smartcube/splits.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/smartcube/splits.ts`**

```ts
import { solved, applyAlg, faceletGeometry } from "../facecube";
import type { Facelets } from "../facecube";
import type { StageSplits } from "../../types/profile";

export type SplitResult = {
  splits: StageSplits;
  total: number;
  moves: number;
  tps: number;
};

type FaceKey = "U" | "D" | "R" | "L" | "F" | "B";

const FACE_AXIS: Record<FaceKey, { axis: 0 | 1 | 2; val: 1 | -1 }> = {
  U: { axis: 1, val: 1 },
  D: { axis: 1, val: -1 },
  R: { axis: 0, val: 1 },
  L: { axis: 0, val: -1 },
  F: { axis: 2, val: 1 },
  B: { axis: 2, val: -1 },
};
const FACES = Object.keys(FACE_AXIS) as FaceKey[];

const REF = solved();
const GEO = faceletGeometry(); // per-facelet { pos, normal } in {-1,0,1}^3

const zeros = (p: readonly number[]) => p.filter((c) => c === 0).length;

type FaceSets = { cross: number[][]; f2l: number[]; topFace: number[]; topCenter: number };

function buildSets(face: FaceKey): FaceSets {
  const { axis, val } = FACE_AXIS[face];

  // Cross edge cubies on the down face: edge cubies (one zero coord) with pos[axis]===val.
  const byCubie = new Map<string, number[]>();
  GEO.forEach((g, i) => {
    if (g.pos[axis] === val && zeros(g.pos) === 1) {
      const k = g.pos.join(",");
      byCubie.set(k, [...(byCubie.get(k) ?? []), i]);
    }
  });
  const cross = [...byCubie.values()];

  // First two layers: every facelet whose cubie is not in the top layer.
  const f2l = GEO.map((_, i) => i).filter((i) => GEO[i].pos[axis] !== -val);

  // The opposite (top) face's 9 stickers, and its center.
  const topFace = GEO.map((_, i) => i).filter((i) => GEO[i].normal[axis] === -val);
  const topCenter = topFace.find((i) => zeros(GEO[i].pos) === 2)!;

  return { cross, f2l, topFace, topCenter };
}

const SETS: Record<FaceKey, FaceSets> = Object.fromEntries(
  FACES.map((f) => [f, buildSets(f)]),
) as Record<FaceKey, FaceSets>;

export function crossSolved(state: Facelets, face: FaceKey): boolean {
  return SETS[face].cross.every((cubie) => cubie.every((i) => state[i] === REF[i]));
}

export function f2lComplete(state: Facelets, face: FaceKey): boolean {
  return SETS[face].f2l.every((i) => state[i] === REF[i]);
}

export function ollComplete(state: Facelets, face: FaceKey): boolean {
  if (!f2lComplete(state, face)) return false;
  const c = state[SETS[face].topCenter];
  return SETS[face].topFace.every((i) => state[i] === c);
}

export function fullySolved(state: Facelets): boolean {
  return state.every((v, i) => v === REF[i]);
}

function firstIndex(states: Facelets[], pred: (s: Facelets) => boolean, from = 0): number {
  for (let i = from; i < states.length; i++) if (pred(states[i])) return i;
  return -1;
}

type Candidate = { face: FaceKey; cross: number; f2l: number; oll: number; solvedIdx: number };

export function detectSplits(
  start: Facelets,
  moves: { token: string; t: number }[],
): SplitResult | null {
  const states: Facelets[] = [start];
  let cur = start;
  for (const m of moves) {
    cur = applyAlg(cur, m.token);
    states.push(cur);
  }
  const T = [0, ...moves.map((m) => m.t)]; // T[0] = solve start; T[i] = time after move i

  let best: Candidate | null = null;
  for (const face of FACES) {
    const cross = firstIndex(states, (s) => crossSolved(s, face));
    if (cross < 0) continue;
    const f2l = firstIndex(states, (s) => f2lComplete(s, face), cross);
    if (f2l < 0) continue;
    const oll = firstIndex(states, (s) => ollComplete(s, face), f2l);
    if (oll < 0) continue;
    const solvedIdx = firstIndex(states, fullySolved, oll);
    if (solvedIdx < 0) continue;
    const cand: Candidate = { face, cross, f2l, oll, solvedIdx };
    // Real bottom finishes F2L earliest; break ties on the earliest cross.
    if (!best || cand.f2l < best.f2l || (cand.f2l === best.f2l && cand.cross < best.cross)) {
      best = cand;
    }
  }
  if (!best) return null;

  const sec = (a: number, b: number) => (T[a] - T[b]) / 1000;
  const splits: StageSplits = {
    cross: sec(best.cross, 0),
    f2l: sec(best.f2l, best.cross),
    oll: sec(best.oll, best.f2l),
    pll: sec(best.solvedIdx, best.oll),
  };
  const total = sec(best.solvedIdx, 0);
  return { splits, total, moves: moves.length, tps: total > 0 ? moves.length / total : 0 };
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/smartcube/splits.test.ts && npm run typecheck`
Expected: PASS. (If the `SUNE + T_PERM` invariant test reveals a transient early completion, it still only asserts non-negativity and sum — which hold by construction.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/smartcube/splits.ts src/lib/smartcube/splits.test.ts
git commit -m "feat(coach): color-neutral per-stage split detection"
```

---

### Task 4: Coach engine

**Files:**
- Create: `src/lib/coach.ts`
- Test: `src/lib/coach.test.ts`

**Interfaces:**
- Consumes: `SmartSolve`, `StageSplits` from `../types/profile`.
- Produces:
  - `type CoachArea = "cross" | "f2l" | "oll" | "pll" | "overall"`
  - `type CoachInsight = { id: string; area: CoachArea; severity: "focus" | "tip" | "info"; headline: string; detail: string; action?: { label: string; to: string } }`
  - `type CoachReport = { summary: string; insights: CoachInsight[] }`
  - `type CoachInput = { solves: SmartSolve[] }`
  - `interface CoachProvider { analyze(input: CoachInput): CoachReport | Promise<CoachReport> }`
  - `const heuristicCoach: CoachProvider`

**Design note:** Keep v1 input to just `solves` (splits already carry everything the heuristics need). `known`/`stageAvgs` from the spec are deferred — YAGNI until a heuristic needs them. Benchmarks are a small table of target stage splits per total-time bracket. Each heuristic emits at most one insight; the report is ranked focus → tip → info.

- [ ] **Step 1: Write the failing test**

Create `src/lib/coach.test.ts`:

```ts
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
    const solves = Array.from({ length: 5 }, () =>
      solve({ cross: 1.5, f2l: 14, oll: 2.5, pll: 2.5 }),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/coach.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/coach.ts`**

```ts
import type { SmartSolve, StageSplits } from "../types/profile";

export type CoachArea = "cross" | "f2l" | "oll" | "pll" | "overall";

export type CoachInsight = {
  id: string;
  area: CoachArea;
  severity: "focus" | "tip" | "info";
  headline: string;
  detail: string;
  action?: { label: string; to: string };
};

export type CoachReport = { summary: string; insights: CoachInsight[] };
export type CoachInput = { solves: SmartSolve[] };

export interface CoachProvider {
  analyze(input: CoachInput): CoachReport | Promise<CoachReport>;
}

const STAGES = ["cross", "f2l", "oll", "pll"] as const;
type StageKey = (typeof STAGES)[number];
const WINDOW = 12;
const MIN_SOLVES = 3;

const STAGE_META: Record<StageKey, { label: string; action: { label: string; to: string } }> = {
  cross: { label: "cross", action: { label: "Open cross trainer", to: "/trainer?mode=cross" } },
  f2l: { label: "F2L", action: { label: "Open look-ahead trainer", to: "/trainer?mode=lookahead" } },
  oll: { label: "OLL", action: { label: "Open alg trainer", to: "/trainer?mode=algset" } },
  pll: { label: "PLL", action: { label: "Open PLL recognition", to: "/trainer?mode=pll" } },
};

// Target stage splits (seconds) per total-time bracket. Coarse but useful.
const BENCHMARKS: { maxTotal: number; target: StageSplits }[] = [
  { maxTotal: 20, target: { cross: 1.5, f2l: 9, oll: 2.5, pll: 2 } },
  { maxTotal: 30, target: { cross: 2.5, f2l: 14, oll: 4, pll: 3.5 } },
  { maxTotal: 45, target: { cross: 4, f2l: 22, oll: 6, pll: 5 } },
  { maxTotal: Infinity, target: { cross: 6, f2l: 34, oll: 10, pll: 8 } },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function stageAverages(solves: SmartSolve[]): StageSplits {
  return {
    cross: mean(solves.map((s) => s.splits.cross)),
    f2l: mean(solves.map((s) => s.splits.f2l)),
    oll: mean(solves.map((s) => s.splits.oll)),
    pll: mean(solves.map((s) => s.splits.pll)),
  };
}

function benchmarkFor(total: number): StageSplits {
  return BENCHMARKS.find((b) => total <= b.maxTotal)!.target;
}

// Stage with the largest gap above its benchmark (in seconds).
function bottleneck(avgs: StageSplits, bench: StageSplits): { stage: StageKey; gap: number } {
  let best: { stage: StageKey; gap: number } = { stage: "f2l", gap: -Infinity };
  for (const st of STAGES) {
    const gap = avgs[st] - bench[st];
    if (gap > best.gap) best = { stage: st, gap };
  }
  return best;
}

// Coefficient of variation of a stage across solves.
function cvOf(solves: SmartSolve[], st: StageKey): number {
  const xs = solves.map((s) => s.splits[st]);
  const m = mean(xs);
  if (m === 0) return 0;
  const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  return sd / m;
}

export const heuristicCoach: CoachProvider = {
  analyze({ solves }): CoachReport {
    if (solves.length < MIN_SOLVES) {
      return {
        summary: "Do a few solves and I'll start coaching.",
        insights: [
          {
            id: "warmup",
            area: "overall",
            severity: "info",
            headline: `Need ${MIN_SOLVES - solves.length} more solve(s)`,
            detail: "The coach analyses your recent solves — keep going.",
            action: { label: "See your plan", to: "/plan" },
          },
        ],
      };
    }

    const recent = solves.slice(-WINDOW);
    const avgs = stageAverages(recent);
    const avgTotal = mean(recent.map((s) => s.total));
    const bench = benchmarkFor(avgTotal);
    const insights: CoachInsight[] = [];

    // Focus: biggest gap above benchmark.
    const bn = bottleneck(avgs, bench);
    if (bn.gap > 0.5) {
      const meta = STAGE_META[bn.stage];
      insights.push({
        id: `bottleneck-${bn.stage}`,
        area: bn.stage,
        severity: "focus",
        headline: `${meta.label} is your biggest time sink`,
        detail: `Your ${meta.label} averages ${avgs[bn.stage].toFixed(1)}s vs a ${bench[bn.stage].toFixed(1)}s target for a ${avgTotal.toFixed(0)}s solve — about ${bn.gap.toFixed(1)}s to gain.`,
        action: meta.action,
      });
    }

    // Tip: least consistent stage (excluding the one already flagged as focus).
    const cvRanked = STAGES.filter((st) => st !== bn.stage)
      .map((st) => ({ st, cv: cvOf(recent, st) }))
      .sort((a, b) => b.cv - a.cv);
    if (cvRanked[0] && cvRanked[0].cv > 0.35) {
      const st = cvRanked[0].st;
      const meta = STAGE_META[st];
      insights.push({
        id: `consistency-${st}`,
        area: st,
        severity: "tip",
        headline: `${meta.label} is inconsistent`,
        detail: `Your ${meta.label} time swings a lot (CV ${(cvRanked[0].cv * 100).toFixed(0)}%) — usually a recognition gap. Drill it for smoother, more predictable times.`,
        action: meta.action,
      });
    }

    // Info: trend across the recent window (first half vs second half).
    if (recent.length >= 4) {
      const half = Math.floor(recent.length / 2);
      const older = mean(recent.slice(0, half).map((s) => s.total));
      const newer = mean(recent.slice(half).map((s) => s.total));
      const delta = older - newer;
      if (Math.abs(delta) > 0.3) {
        insights.push({
          id: "trend",
          area: "overall",
          severity: "info",
          headline: delta > 0 ? "Trending faster" : "Slower than earlier",
          detail:
            delta > 0
              ? `You're ${delta.toFixed(1)}s faster across this session — keep the momentum.`
              : `You've slowed ${Math.abs(delta).toFixed(1)}s this session — take a breath and reset.`,
        });
      }
    }

    const order = { focus: 0, tip: 1, info: 2 };
    insights.sort((a, b) => order[a.severity] - order[b.severity]);

    const summary =
      insights.find((i) => i.severity === "focus")?.headline ??
      `Solid ${avgTotal.toFixed(1)}s average — keep drilling.`;
    return { summary, insights };
  },
};
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/coach.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coach.ts src/lib/coach.test.ts
git commit -m "feat(coach): heuristic coach behind CoachProvider seam"
```

---

### Task 5: `SmartCubeSession` component

**Files:**
- Create: `src/components/SmartCubeSession.tsx`
- Test: `src/components/SmartCubeSession.test.tsx`

**Interfaces:**
- Consumes: `SmartCube`, `CubeMove`, `moveToken` (Task 2); `detectSplits` (Task 3); `useProfile().recordSmartSolve` + `appendTimeSample` fusion (Task 1); `generateScramble` from `../lib/scramble`; `solved`, `applyAlg` from `../lib/facecube`.
- Produces: `default function SmartCubeSession({ cube }: { cube: SmartCube })` — connects, shows a scramble, tracks application, times the solve, records splits + feeds `addTime` per stage, renders the live split readout. Accepts the cube via props so tests inject a `SimulatorCube`.

**Behavior:**
1. On mount subscribe to `cube.onMove`. Maintain a running `facecube` state from `solved()` (assume the cube starts solved on connect).
2. Show a generated scramble (`generateScramble(20)`). Track applied moves; when running state equals `applyAlg(solved(), scramble)`, mark **ready** and snapshot that state as `solveStart`.
3. The first move after ready starts the solve clock (`t0 = m.t`); buffer `{ token: moveToken(m), t: m.t - t0 }`. On each move recompute `detectSplits(solveStart, buffer)`; when it returns non-null (solved), the solve is complete.
4. On completion: `recordSmartSolve({ date: today, ...result })` and for each stage call `addTime(stage, seconds)` (skip a stage whose split is 0). Reset for the next scramble.
5. Expose the live split readout with `data-testid` per stage for tests.

- [ ] **Step 1: Write the failing test**

Create `src/components/SmartCubeSession.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProfileProvider } from "../state/ProfileProvider";
import { SimulatorCube } from "../lib/smartcube/simulator";
import type { CubeMove, Face } from "../lib/smartcube/smartcube";
import { solved, applyAlg } from "../lib/facecube";
import SmartCubeSession from "./SmartCubeSession";

// Build a CubeMove stream from an alg (single quarter turns only).
function movesFrom(alg: string, t0: number): CubeMove[] {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok, i) => ({
      face: tok[0] as Face,
      dir: tok.endsWith("'") ? -1 : 1,
      t: t0 + (i + 1) * 100,
    }));
}

describe("SmartCubeSession", () => {
  it("captures a solve and shows per-stage splits", async () => {
    const cube = new SimulatorCube();
    await cube.connect();
    render(
      <ProfileProvider>
        <SmartCubeSession cube={cube} />
      </ProfileProvider>,
    );

    // Read the scramble the component chose, apply it, then solve it (inverse).
    const scramble = screen.getByTestId("scramble").textContent!.trim();
    const inverse = scramble
      .split(/\s+/)
      .reverse()
      .map((t) => (t.endsWith("'") ? t[0] : `${t[0]}'`))
      .join(" ");

    act(() => cube.feed(movesFrom(scramble, 0)));         // apply scramble → ready
    act(() => cube.feed(movesFrom(inverse, 100_000)));    // solve it

    // A split readout appears (total shown, non-empty).
    expect(screen.getByTestId("live-total").textContent).not.toBe("—");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SmartCubeSession.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/SmartCubeSession.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import type { SmartCube, CubeMove } from "../lib/smartcube/smartcube";
import { moveToken } from "../lib/smartcube/smartcube";
import { detectSplits } from "../lib/smartcube/splits";
import type { SplitResult } from "../lib/smartcube/splits";
import { solved, applyAlg } from "../lib/facecube";
import type { Facelets } from "../lib/facecube";
import { generateScramble } from "../lib/scramble";
import { useProfile } from "../state/ProfileProvider";
import type { Stage } from "../types/profile";

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(2));

export default function SmartCubeSession({ cube }: { cube: SmartCube }) {
  const { recordSmartSolve, addTime } = useProfile();
  const [scramble, setScramble] = useState(() => generateScramble(20));
  const [ready, setReady] = useState(false);
  const [last, setLast] = useState<SplitResult | null>(null);

  // Mutable per-solve state kept in refs so the move handler always sees fresh values.
  const runningRef = useRef<Facelets>(solved());
  const targetRef = useRef<Facelets>(applyAlg(solved(), scramble));
  const readyRef = useRef(false);
  const startStateRef = useRef<Facelets | null>(null);
  const t0Ref = useRef(0);
  const bufRef = useRef<{ token: string; t: number }[]>([]);

  useEffect(() => {
    targetRef.current = applyAlg(solved(), scramble);
    runningRef.current = solved();
    readyRef.current = false;
    setReady(false);
    startStateRef.current = null;
    bufRef.current = [];
  }, [scramble]);

  useEffect(() => {
    const onMove = (m: CubeMove) => {
      const token = moveToken(m);
      runningRef.current = applyAlg(runningRef.current, token);

      if (!readyRef.current) {
        // Waiting for the scramble to be applied.
        if (runningRef.current.every((v, i) => v === targetRef.current[i])) {
          readyRef.current = true;
          startStateRef.current = runningRef.current;
          setReady(true);
        }
        return;
      }

      // Solving.
      if (bufRef.current.length === 0) t0Ref.current = m.t;
      bufRef.current.push({ token, t: m.t - t0Ref.current });
      const res = detectSplits(startStateRef.current!, bufRef.current);
      if (res) {
        recordSmartSolve({ date: today(), ...res });
        (["cross", "f2l", "oll", "pll"] as Stage[]).forEach((st) => {
          if (res.splits[st] > 0) addTime(st, res.splits[st]);
        });
        setLast(res);
        setScramble(generateScramble(20)); // triggers reset effect
      }
    };
    const unsub = cube.onMove(onMove);
    return unsub;
  }, [cube, recordSmartSolve, addTime]);

  return (
    <div className="rounded border border-slate-200 dark:border-slate-700 p-4">
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
        {ready ? "Solving… go!" : "Apply this scramble to your cube"}
      </div>
      <div data-testid="scramble" className="font-mono text-lg mb-4">
        {scramble}
      </div>
      <div className="grid grid-cols-5 gap-3 text-center">
        <Split label="Cross" testId="live-cross" value={last ? last.splits.cross : null} />
        <Split label="F2L" testId="live-f2l" value={last ? last.splits.f2l : null} />
        <Split label="OLL" testId="live-oll" value={last ? last.splits.oll : null} />
        <Split label="PLL" testId="live-pll" value={last ? last.splits.pll : null} />
        <Split label="Total" testId="live-total" value={last ? last.total : null} bold />
      </div>
    </div>
  );
}

function Split({
  label,
  value,
  testId,
  bold,
}: {
  label: string;
  value: number | null;
  testId: string;
  bold?: boolean;
}) {
  return (
    <div>
      <div
        data-testid={testId}
        className={`text-xl tabular-nums ${bold ? "font-bold" : "font-semibold"}`}
      >
        {fmt(value)}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/components/SmartCubeSession.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SmartCubeSession.tsx src/components/SmartCubeSession.test.tsx
git commit -m "feat(coach): SmartCubeSession captures splits + feeds profile"
```

---

### Task 6: Coach page, route, and Nav (gated to smart cubes)

**Files:**
- Create: `src/pages/Coach.tsx`
- Test: `src/pages/Coach.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Nav.tsx`

**Interfaces:**
- Consumes: `SmartCubeSession` (Task 5); `heuristicCoach` (Task 4); `useProfile().profile` + `getSmartSolves`; `SimulatorCube` (dev fallback).
- Produces: `default function Coach()` — renders the gating empty state OR a live session + coach report. Route `/coach`; Nav link "Coach".

**Gating rule ("only for smart cubes"):** if `typeof navigator !== "undefined" && !("bluetooth" in navigator)` AND no simulator override, show the connect/empty state. A `?sim=1` query param (or a dev "Use simulator" button) injects a `SimulatorCube` so the flow is testable and dev-usable without hardware.

- [ ] **Step 1: Write the failing test**

Create `src/pages/Coach.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileProvider } from "../state/ProfileProvider";
import Coach from "./Coach";

function renderAt(path: string) {
  return render(
    <ProfileProvider>
      <MemoryRouter initialEntries={[path]}>
        <Coach />
      </MemoryRouter>
    </ProfileProvider>,
  );
}

describe("Coach page", () => {
  it("shows the connect prompt when no smart cube is available", () => {
    renderAt("/coach");
    expect(screen.getByText(/smart cube/i)).toBeInTheDocument();
  });

  it("shows a live session when the simulator is enabled", () => {
    renderAt("/coach?sim=1");
    expect(screen.getByTestId("scramble")).toBeInTheDocument();
    // Coach report region is present (warm-up message with too few solves).
    expect(screen.getByTestId("coach-report")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Coach.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/pages/Coach.tsx`**

```tsx
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProfile } from "../state/ProfileProvider";
import { getSmartSolves } from "../lib/profile";
import { heuristicCoach } from "../lib/coach";
import type { CoachInsight } from "../lib/coach";
import { SimulatorCube } from "../lib/smartcube/simulator";
import type { SmartCube } from "../lib/smartcube/smartcube";
import SmartCubeSession from "../components/SmartCubeSession";

const hasBluetooth = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

export default function Coach() {
  const { profile } = useProfile();
  const [params] = useSearchParams();
  const sim = params.get("sim") === "1";

  // A stable cube instance for this mount (simulator in tests / dev).
  const [cube] = useState<SmartCube | null>(() => {
    if (sim) {
      const c = new SimulatorCube();
      void c.connect();
      return c;
    }
    return null;
  });

  const solves = getSmartSolves(profile);
  const report = useMemo(() => heuristicCoach.analyze({ solves }), [solves]);

  if (!cube && !hasBluetooth()) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold mb-2">Coach</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          The coach works with a <strong>smart cube</strong> — a Bluetooth cube that streams every
          turn. Your browser doesn't support Web Bluetooth (try Chrome/Edge on desktop or Android),
          so there's no cube to connect.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You can still explore your{" "}
          <Link className="underline" to="/plan">
            training plan
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">Coach</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        Solve on your smart cube — I'll break down every solve by stage and tell you what to work on.
      </p>

      {cube ? (
        <div className="mb-6">
          <SmartCubeSession cube={cube} />
        </div>
      ) : (
        <ConnectPrompt />
      )}

      <section data-testid="coach-report" className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="text-sm font-medium mb-3">{report.summary}</div>
        <ul className="space-y-3">
          {report.insights.map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </ul>
      </section>
    </main>
  );
}

function ConnectPrompt() {
  // Real-hardware connect flow (GAN driver) is Task 7. Until then, prompt to use ?sim=1.
  return (
    <div className="mb-6 rounded border border-dashed border-slate-300 dark:border-slate-600 p-4 text-sm text-slate-600 dark:text-slate-300">
      Connect a smart cube to begin. (Hardware pairing lands next; append{" "}
      <code>?sim=1</code> to try the simulator.)
    </div>
  );
}

const SEVERITY_STYLE: Record<CoachInsight["severity"], string> = {
  focus: "border-l-4 border-red-500 bg-red-50 dark:bg-red-950/40",
  tip: "border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/40",
  info: "border-l-4 border-slate-400 bg-slate-50 dark:bg-slate-800/60",
};

function InsightCard({ insight }: { insight: CoachInsight }) {
  return (
    <li className={`rounded p-3 ${SEVERITY_STYLE[insight.severity]}`}>
      <div className="font-semibold">{insight.headline}</div>
      <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{insight.detail}</div>
      {insight.action ? (
        <Link className="mt-2 inline-block text-sm underline" to={insight.action.to}>
          {insight.action.label}
        </Link>
      ) : null}
    </li>
  );
}
```

- [ ] **Step 4: Wire the route in `src/App.tsx`**

Add the import and route:

```tsx
import Coach from "./pages/Coach";
```

Inside `<Routes>`, after the `/timer` route:

```tsx
          <Route path="/coach" element={<Coach />} />
```

- [ ] **Step 5: Add the Nav link in `src/components/Nav.tsx`**

Add to the `LINKS` array (after Timer):

```tsx
  { to: "/coach", label: "Coach" },
```

- [ ] **Step 6: Run tests + typecheck + full suite**

Run: `npx vitest run src/pages/Coach.test.tsx && npm run typecheck && npx vitest run`
Expected: PASS (whole suite green).

- [ ] **Step 7: Commit**

```bash
git add src/pages/Coach.tsx src/pages/Coach.test.tsx src/App.tsx src/components/Nav.tsx
git commit -m "feat(coach): gated /coach page with live session + coach report"
```

---

### Task 7 (BLOCKED — needs user OK): Real GAN Web Bluetooth driver

**Do not start** until the user confirms Fork B (target GAN) and approves adding the
`gan-web-bluetooth` (MIT) runtime dependency. This is the repo's first runtime dep.

**Files (planned):**
- Create: `src/lib/smartcube/gan.ts` — `class GanCube implements SmartCube`, mapping the
  library's move events to `CubeMove` (`{ face, dir, t }`) using the cube's hardware
  timestamp when available; `connect()` triggers Web Bluetooth device selection.
- Modify: `src/pages/Coach.tsx` — the `ConnectPrompt` "Connect" button instantiates
  `GanCube` and, on success, swaps it in as the active `cube`.

**Notes:** feature-detect `navigator.bluetooth`; keep `GanCube` behind a dynamic
`import()` so the library isn't in the main bundle for non-Bluetooth users. No changes
to Tasks 1–6 interfaces. Tests: mock the library boundary; the split/coach layers are
already covered via the simulator.

---

### Task 8 (BLOCKED — needs user OK): Claude-backed coach provider

**Do not start** until the user confirms Fork A (wants an LLM coach) and the API-key UX.

**Files (planned):**
- Create: `src/lib/coach-claude.ts` — `claudeCoach: CoachProvider` calling the Anthropic
  API from the browser (`anthropic-dangerous-direct-browser-access`), key read from a new
  optional `settings.anthropicKey`. Same `analyze(input)` shape; returns `CoachReport`.
- Modify: coach UI to let the user pick provider and enter/store a key.

**Notes:** the `CoachProvider` seam means this is additive; `heuristicCoach` stays the
default and offline fallback. Consult the `claude-api` skill for model id + headers
before implementing.

---

## Self-Review

**1. Spec coverage:**
- Driver interface + `SimulatorCube` → Task 2. ✓
- Split detection → Task 3. ✓
- Solve session + capture → Task 5. ✓
- Coach engine + `CoachProvider` seam → Task 4. ✓
- `/coach` route + Nav + gating → Task 6. ✓
- Profile schema `smartSolves` + fusion via `appendTimeSample`/`addTime` → Task 1 (schema) + Task 5 (fusion). ✓
- Real GAN driver → Task 7 (gated). ✓
- LLM provider → Task 8 (gated). ✓
- Error handling (no Bluetooth, `detectSplits` null, invalid time) → Task 6 gating, Task 3 null return, Task 1 guard. ✓
- The spec's `CoachInput.known`/`stageAvgs` were dropped as YAGNI (documented in Task 4's design note); no heuristic needs them in v1.

**2. Placeholder scan:** No TBD/TODO in Tasks 1–6. Tasks 7–8 are intentionally interface-level because they're blocked on user decisions; they carry no code steps to execute.

**3. Type consistency:** `SmartSolve`/`StageSplits` defined in Task 1 and consumed unchanged in Tasks 3–5. `SplitResult` defined in Task 3, consumed in Task 5. `recordSmartSolve` signature matches across `profile.ts`, `ProfileProvider`, and `SmartCubeSession`. `detectSplits(start, moves)` signature identical in Tasks 3 and 5. Stage keys `cross/f2l/oll/pll` align with `Stage` in `types/profile.ts` (so `addTime(stage, …)` fusion typechecks). Routes used in coach actions (`/trainer?mode=lookahead`, etc.) match existing links in `regimen.ts`.
