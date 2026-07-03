# Smart Cube AI Coach

**Date:** 2026-07-02
**Status:** Proposed (defaults chosen while user away; two forks flagged for confirmation)

## Goal

Add an **AI coach** that only works with a **smart cube** (a Bluetooth cube that
streams every turn). While connected, the app auto-captures each solve's
**per-stage splits** — cross / F2L / OLL / PLL — with zero manual timing, feeds
them into the existing profile, and a coach analyzes recent solves to tell the
user *what to work on next* and *why*, linking straight into the relevant
trainer.

## Motivation

A regular timer only knows one number per solve (total time). A smart cube knows
every move and its hardware timestamp, so we can reconstruct the exact cube state
after each turn and detect the precise moment cross, F2L, OLL, and PLL each
finish. That yields real split times — the single most useful diagnostic in
speedcubing — for free, every solve. The app already has:

- A full, tested cube model (`facecube.ts`) with `applyAlg`, `isF2LComplete`,
  `isSolvedUpToRotation`, `normalizeOrientation`.
- An edges model + cross predicates (`cube.ts`, `cross.ts`).
- A profile with per-stage `times` that the training-plan generator
  (`regimen.ts`) already consumes.

So split-detection is a pure, testable fold over the existing cube model, and the
splits plug straight into the plan the app already builds. The coach turns those
splits into prioritized, actionable guidance — the "AI coach" the request asks
for.

## Assumed defaults (flagged — confirm on return)

The user stepped away before answering three product/hardware forks. Defaults
below were chosen so the **core is correct regardless of the answers**; only two
clearly-bounded add-on layers depend on the forks.

1. **Coach engine = heuristic now, LLM seam later.** A deterministic engine ships
   first: no API key, offline, private, matches the app's pure-function style. It
   sits behind a `CoachProvider` interface so a Claude-backed provider can be
   added later with no rework. *(Fork A — could instead be LLM-first.)*
2. **Smart cube = interface + simulator + real GAN driver.** The `SmartCube`
   interface and a `SimulatorCube` make the whole pipeline buildable and
   unit-testable now. A real **GAN** Web Bluetooth driver (most popular brand) is
   the concrete hardware path, added behind the same interface. *(Fork B — could
   target MoYu/QiYi instead, or stay simulator-only.)*
3. **Core value = auto per-stage splits, splits-first.** Splits are the headline
   the coach uses; the raw move log is retained so replay/efficiency analysis can
   build on it later.

**Dependency flag:** the real GAN driver needs one new runtime dependency
(`gan-web-bluetooth`, MIT) — the repo's first. Requires explicit user OK before
wiring. Everything else (interface, simulator, split detection, coach, UI) is
zero-dependency and lands first.

## Scope

In scope (this spec):

- `SmartCube` driver interface + `SimulatorCube` (scripted/keyboard move feed).
- Split detection (`lib/smartcube/splits.ts`): move stream → per-stage splits.
- Solve session component: connect, apply scramble, live splits, per-solve capture.
- Coach engine (`lib/coach.ts`): `CoachProvider` interface + `heuristicCoach`.
- New `/coach` route + Nav entry, gated to smart-cube availability.
- Profile schema: `smartSolves?: SmartSolve[]`; each solve also `appendTimeSample`s
  per stage so the existing plan reflects real cube data ("the fusion").
- Tests at every layer (simulator-driven, fixture-based).

Add-on layers (specified here, sequenced after the tested core; each gated on a
confirmation):

- **Real GAN Web Bluetooth driver** (`GanCube`) behind `SmartCube` — needs the
  dependency OK.
- **LLM coach provider** (`claudeCoach`) behind `CoachProvider` — needs Fork A
  confirmation and an API-key UX decision.

Out of scope (YAGNI):

- Multiple smart-cube brands at once (one real driver; interface leaves room).
- 3D cube render / move replay UI (move log is persisted; viewer is later work).
- Gyroscope-based orientation tracking (splits use the move stream only).
- Cloud sync / accounts (profile stays in `localStorage`).
- Editing or deleting individual smart solves.

## Architecture

Four independently-testable layers. Data flows: driver → split detector →
profile → coach → UI.

### Layer 1 — Driver interface + drivers (`src/lib/smartcube/`)

A minimal interface every cube driver implements. A "move" is one quarter turn
with a hardware-relative timestamp.

```ts
// smartcube.ts
export type Face = "U" | "D" | "L" | "R" | "F" | "B";
export type CubeMove = { face: Face; dir: 1 | -1; t: number }; // t = ms, cube clock if available else performance.now()

export interface SmartCube {
  readonly brand: string;
  readonly connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMove(cb: (m: CubeMove) => void): () => void;   // returns unsubscribe
  onDisconnect(cb: () => void): () => void;
}

// Turn a CubeMove into a token facecube.applyAlg understands ("R", "U'", ...).
export function moveToken(m: CubeMove): string;
```

Drivers:

- **`SimulatorCube`** (`simulator.ts`) — implements `SmartCube` by emitting moves
  from `feed(moves)` or from keyboard keys (u/d/l/r/f/b, shift = prime) in dev.
  Deterministic; timestamps injected by the caller so tests never touch the
  clock. Powers all pipeline + UI tests.
- **`GanCube`** (`gan.ts`, add-on) — real Web Bluetooth via `gan-web-bluetooth`.
  Feature-gated on `navigator.bluetooth`; maps library move events to `CubeMove`.
  Not imported unless the user connects real hardware.

A tiny factory picks a driver: `createSmartCube(kind)` where `kind` is
`"simulator"` or `"gan"`.

### Layer 2 — Split detection (`src/lib/smartcube/splits.ts`, pure)

Fold the move stream onto `facecube` state and detect each stage's completion.
Detection uses the **final contiguous "stays-complete" run** of each predicate, so
a piece momentarily popping out mid-solve doesn't produce a false split.

```ts
export type StageSplits = { cross: number; f2l: number; oll: number; pll: number }; // seconds
export type SplitResult = { splits: StageSplits; total: number; moves: number; tps: number };

// moves: solve moves only (post-scramble), each { token, t } with t in ms.
export function detectSplits(moves: { token: string; t: number }[]): SplitResult | null;
```

Predicates (color/rotation-neutral, reusing existing helpers):

- **F2L complete** — `isF2LComplete(state)` (already exists, orientation-normalized).
- **Solved** — `isSolvedUpToRotation(state)` (already exists).
- **OLL complete** — F2L complete AND, after `normalizeOrientation`, all nine U-face
  stickers equal the U center. New helper `isOLLComplete(state)`.
- **Cross complete** — the four cross edges of the down face are home + oriented.
  The down face is the one implied by the F2L-complete orientation, so cross is
  computed for that face. New helper `isCrossComplete(state)` (may reuse the edges
  model from `cube.ts`/`cross.ts`).

Algorithm:

1. Fold moves; store `state[i]` and `t[i]` after each move (state[0] = pre-first-move).
2. Find `solvedIdx` = last index (solve ends solved by construction).
3. `f2lIdx` = earliest index of the final run where F2L stays complete to the end.
4. `ollIdx` = earliest index ≥ f2lIdx where OLL stays complete to the end.
5. `crossIdx` = earliest index of the final run where the down cross stays complete
   through f2lIdx.
6. Splits = timestamp deltas: `cross = t[crossIdx]-t[0]`, `f2l = t[f2lIdx]-t[crossIdx]`,
   `oll = t[ollIdx]-t[f2lIdx]`, `pll = t[solvedIdx]-t[ollIdx]`; `total = t[solvedIdx]-t[0]`.
7. `moves` = count; `tps = moves / total`. Returns `null` if never solved.

Locked by fixture tests: hand-authored move sequences with known boundaries, plus
solved-state predicate tests.

### Layer 3 — Coach engine (`src/lib/coach.ts`, pure)

```ts
export type CoachArea = "cross" | "f2l" | "oll" | "pll" | "overall";
export type CoachInsight = {
  id: string;
  area: CoachArea;
  severity: "focus" | "tip" | "info";  // ranked focus > tip > info
  headline: string;
  detail: string;
  action?: { label: string; to: string }; // link into an existing route
};
export type CoachReport = { summary: string; insights: CoachInsight[] };

export type CoachInput = {
  solves: SmartSolve[];              // newest last
  known: Record<CoachArea, number>;  // known-case counts, for context
  stageAvgs: StageSplits;            // from profile.times
};

export interface CoachProvider {
  analyze(input: CoachInput): CoachReport | Promise<CoachReport>;
}
export const heuristicCoach: CoachProvider = { analyze(input) { /* ... */ } };
```

`heuristicCoach` heuristics (v1), each emitting at most one insight, ranked:

- **Warm-up gate** — < 3 solves → single `info` insight: "do a few solves".
- **Bottleneck** — per-stage avg over the last ≤12 solves vs a small benchmark
  table (target splits by total-time bracket: sub-20/30/45/60/90). Largest gap
  above benchmark → `focus`, linked to that stage's trainer.
- **Consistency** — stage with highest coefficient of variation → `tip`
  ("inconsistent recognition") linked to the recognition trainer.
- **Recognition pause** — OLL or PLL split high relative to its move count →
  `tip`, linked to the recognition quiz / alg set.
- **Trend** — recent half vs older half of solves → `info` (improving/regressing).

Benchmarks live in a small typed table in `coach.ts`. The provider seam means a
future `claudeCoach` implements the same `analyze` and is swapped in one place.

### Layer 4 — UI (`src/pages/Coach.tsx`, `src/components/SmartCubeSession.tsx`)

- New route `/coach` in `App.tsx`; Nav entry "Coach".
- **Gating ("only for smart cubes"):** if `!navigator.bluetooth` and no simulator
  override → a "Connect a smart cube" empty state explaining the feature. This is
  what enforces "only for smart cubes".
- **`SmartCubeSession`:** Connect button → driver connects. Shows a generated
  scramble to apply (reuse `generateScramble`); once the applied moves match the
  scramble target, marks "ready". The next move starts the solve; live per-stage
  split readout updates as predicates fire; on solved, the solve is captured.
- On each captured solve: `recordSmartSolve(profile, solve)` (append to
  `smartSolves`, capped) AND `appendTimeSample(profile, stage, seconds)` for each
  of the four stages — this is the fusion into the existing plan.
- Coach report (`heuristicCoach.analyze`) rendered below, updating after each solve.
- Dev affordance: a keyboard `SimulatorCube` so the whole flow is usable and
  testable without hardware.

## Data model (`src/types/profile.ts`)

Additive and optional, following the existing `regimen?` / `solves?` pattern so
older saves keep loading:

```ts
export type StageSplits = { cross: number; f2l: number; oll: number; pll: number };

export type SmartSolve = {
  date: string;        // ISO YYYY-MM-DD
  total: number;       // seconds
  splits: StageSplits; // seconds per stage
  moves: number;       // quarter-turn count
  tps: number;         // moves / total
};

// UserProfile +=
smartSolves?: SmartSolve[]; // newest last, capped at SMART_SOLVE_CAP (e.g. 200)
```

`lib/profile.ts` gains `getSmartSolves(profile)` (defaulting `undefined` → `[]`)
and `recordSmartSolve(profile, solve)` (append + cap). `ProfileProvider` exposes
`recordSmartSolve`. Reuses the existing `appendTimeSample` for the fusion — no
change to `times`/`regimen`.

## Error handling

- **No Web Bluetooth / user cancels pairing** → stay in the connect empty state
  with a clear message; never throw to the UI.
- **Cube disconnects mid-session** → `onDisconnect` resets the session to
  "disconnected"; a partial (unsolved) solve is discarded, not recorded.
- **`detectSplits` returns `null`** (moves that never reach solved, e.g. user gave
  up) → the solve is discarded; no profile write.
- **Invalid split (non-finite / non-positive)** → `recordSmartSolve` rejects, same
  guard style as `recordSolve`/`appendTimeSample`.

## Testing

- **`smartcube/simulator.test.ts`** — feed moves, assert `onMove`/token mapping,
  unsubscribe, disconnect.
- **`smartcube/splits.test.ts`** — predicate unit tests (cross/F2L/OLL/solved on
  crafted states) + `detectSplits` on fixture move sequences with known
  boundaries + `null` on unsolved.
- **`coach.test.ts`** — warm-up gate, bottleneck ranking against benchmarks,
  consistency/trend, and that each insight's `action.to` is a real route.
- **`profile.test.ts`** — `recordSmartSolve` append/cap/guards; back-compat load
  of a profile without `smartSolves`.
- **`SmartCubeSession.test.tsx` / `Coach.test.tsx`** — with `SimulatorCube`: apply
  scramble → solve → assert splits shown, profile updated, coach report rendered;
  gating empty state when no cube.

## Rollout / sequencing

1. Profile schema + `recordSmartSolve` + tests.
2. `SmartCube` interface + `SimulatorCube` + tests.
3. `splits.ts` + predicates + fixture tests.
4. `coach.ts` + `heuristicCoach` + tests.
5. `SmartCubeSession` + `Coach` page + route + Nav + component tests.
6. **(Confirm Fork B + dep)** `GanCube` real driver behind the interface.
7. **(Confirm Fork A)** `claudeCoach` provider + API-key UX.

Steps 1–5 are a complete, demoable, fully-tested feature on the simulator. Steps
6–7 are add-ons that don't touch the core.
