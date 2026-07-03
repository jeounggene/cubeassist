# Live 3D cube + self-correcting scramble

**Date:** 2026-07-03
**Status:** Approved (fidelity + behavior confirmed via clarifying questions)

## Goal

Two smart-cube enhancements inside the connected coach session:

1. A **live 3D cube** that mirrors the physical smart cube — face turns animate as
   you turn, and the whole cube tilts to match how you hold it (GAN gyroscope) —
   like the GAN app.
2. A **self-correcting scramble**: the app tracks the expected next move, tells you
   when you turn wrong, and live-rewrites the remaining scramble so you always
   reach the *exact same* scrambled state no matter what you turn.

## Motivation

The current session shows the scramble as static text and gates "ready to solve"
on `running === target` — a single misturn silently leaves you stuck with no
feedback. And there's no visual of the cube. The move stream + `facecube` state the
session already maintains make both features cheap: the live state drives a 3D
render, and a remaining-move queue makes scrambling mistake-proof without a solver.

The pieces already exist:
- `facecube.ts` — `faceletGeometry()` (3D pos/normal per facelet), `applyAlg`, `solved`.
- `MiniF2LCube.tsx` — the CSS-3D pattern (faces via `preserve-3d` transforms).
- `SmartCubeSession` — already folds moves onto a running `facecube` state.
- `gan-web-bluetooth` — streams `GYRO` events with an orientation quaternion
  (`+X Red, +Y Blue, +Z White`) and per-quarter `MOVE` events.

## Scope

In scope:
- `CubeView3D` component: cubelet-based CSS-3D cube, animated quarter-turns, gyro
  orientation with a recenter button, fixed-angle fallback.
- `scramble-queue.ts`: pure self-correcting remaining-move queue.
- `SmartCube.onOrientation?` optional method; `GanCube` implements it from `GYRO`.
- `SmartCubeSession` integration: render the cube, drive the queue, show remaining
  scramble + deviation banner + ready state.

Out of scope (YAGNI):
- Full solve replay / scrubbing timeline (the move log is persisted; a viewer is later work).
- Editing the scramble by hand; choosing scramble length here.
- Gyro drift auto-correction beyond the manual recenter button.
- Sticker themes / cube skins.

## Architecture

### Unit B — `src/lib/smartcube/scramble-queue.ts` (pure)

The heart of the self-correcting scramble. A queue of **single quarter-turn** tokens
representing the moves still needed to reach the target scrambled state.

```ts
export type QueueState = { queue: string[]; deviated: boolean };

// Expand a scramble ("R U2 R'") into single quarter tokens ["R","U","U","R'"].
export function initQueue(scramble: string): string[];

// Feed one physical quarter-turn move. If it matches the head, pop it (progress).
// Otherwise the user deviated: prepend inverse(move), collapsing adjacent same-face
// moves. Invariant: applyAlg(currentCubeState, result.queue) always reaches target.
export function applyMove(queue: string[], move: string): QueueState;

// Collapse adjacent same-face runs for display ("R R" -> "R2", "R R'" -> "").
export function simplifyForDisplay(queue: string[]): string[];

export function invertToken(token: string): string; // "R" <-> "R'", "R2" -> "R2"
```

`applyMove` rules (move = one quarter turn like `"R"` / `"R'"`):
- If `queue[0] === move` → `{ queue: queue.slice(1), deviated: false }`.
- Else → prepend `invertToken(move)`, then merge the two leading tokens if same face
  (`R R → R2`, `R R' → drop both`, `R R2 → R'`, `R2 R → R'`, `R2 R2 → drop`) →
  `{ queue: merged, deviated: true }`.

Why the invariant holds: at cube state `C`, the queue `Q` satisfies `Q(C) = target`.
A correct move `m = Q[0]` gives `C' = m(C)` and `Q' = Q[1:]`, and `Q'(C') = Q(C) = target`.
A wrong move `m` gives `C' = m(C)`; prepending `m⁻¹` gives `Q' = [m⁻¹, ...Q]` and
`Q'(C') = Q(m⁻¹(m(C))) = Q(C) = target`. Same-face merges preserve the transform.

The scramble is complete when the queue is empty (state then equals target by
construction).

### Unit A — `src/components/CubeView3D.tsx`

A cubelet-based CSS-3D cube driven by facelet state.

```ts
type Props = {
  facelets: number[];             // current facecube state (54 color ids)
  turn?: { face: Face; dir: 1 | -1; nonce: number } | null; // move to animate
  orientation?: Quaternion | null; // gyro; null => fixed isometric angle
  onTurnDone?: () => void;
};
```

- **Model:** 26 cubelets at positions `{-1,0,1}³` (skip the core), each rendered as
  up to 3 sticker faces (one per outward normal) colored from `facelets` via
  `faceletGeometry()`. Container uses `transform-style: preserve-3d`.
- **Animation:** when `turn` changes (`nonce` bumps), group the 9 cubelets in that
  layer and CSS-transition a 90° rotation about the layer axis (~180ms). On
  `transitionend`, call `onTurnDone` (the parent commits the new `facelets`, which
  re-renders cubelets home and clears `turn`). An **animation queue** in the parent
  serializes turns; if a new move arrives while animating, it **snaps** (commit
  immediately, skip animation) so the render never falls behind the cube.
- **Orientation:** the container transform = base isometric × `quaternionToMatrix3d(orientation)`.
  A small pure helper converts the quaternion (with a stored recenter offset) to a
  CSS `matrix3d`. With no orientation, use the fixed `rotateX(-25deg) rotateY(-35deg)`.
- **Recenter:** parent stores the latest quaternion; a "Recenter" button captures it
  as the neutral reference (applied as conjugation), so the cube faces the user.

Quaternion helpers live in `src/lib/quaternion.ts` (pure): `mul`, `conjugate`,
`toMatrix3d`. Kept tiny and unit-tested.

### Interface addition — `src/lib/smartcube/smartcube.ts`

```ts
export type Quaternion = { x: number; y: number; z: number; w: number };

export interface SmartCube {
  // ...existing...
  onOrientation?(cb: (q: Quaternion) => void): () => void; // optional
}
```

`GanCube` implements `onOrientation` by mapping `GYRO` events'
`quaternion` to `Quaternion` and notifying subscribers. `SimulatorCube` omits it.

### Session integration — `src/components/SmartCubeSession.tsx`

- Replace the `targetRef` equality gate with the queue: on each scramble-phase move,
  `applyMove(queueRef.current, token)`; update `queueRef`, `deviated` banner, and the
  displayed remaining scramble (`simplifyForDisplay`, next move highlighted). Ready
  when the queue is empty → snapshot state as `solveStart` (unchanged downstream).
- Render `CubeView3D` (always, when a cube is connected), fed the running `facelets`,
  the latest `turn` (built from each move), and `orientation` (from
  `cube.onOrientation` if present). A "Recenter" button sits by the cube.
- The solve phase is unchanged (splits via `detectSplits`); the 3D cube keeps
  animating/snapping through the solve.

## Data flow

```
GanCube ──MOVE──▶ SmartCubeSession
   │                 ├─ runningRef = applyAlg(runningRef, token)   (state)
   │                 ├─ turn = {face,dir,nonce++}  ─▶ CubeView3D (animate/snap)
   │                 └─ (scramble phase) applyMove(queue, token)  ─▶ remaining + deviated + ready
   └──GYRO──▶ onOrientation ─▶ orientation ─▶ CubeView3D (tilt)
Recenter button ─▶ neutral quaternion reference
```

## Error handling

- **No gyro** (simulator, or a cube that doesn't stream it) → `onOrientation`
  absent/never fires → fixed isometric angle; Recenter button hidden or inert.
- **Moves faster than animation** → snap (skip animation), never desync.
- **Deviation during scramble** → banner + auto-rewritten queue; never blocks progress.
- **Disconnect mid-scramble** → session resets (existing behavior); queue re-inits on
  the next scramble.

## Testing

- `scramble-queue.test.ts`:
  - `initQueue` expands doubles to quarters.
  - `applyMove`: correct move pops; wrong move sets `deviated` and prepends inverse;
    same-face merges (`R`+`R`→`R2`, `R`+`R'`→empty).
  - **Property test (the invariant):** for several random move sequences over a
    scramble, after every move assert `applyAlg(currentState, queue.join(" "))`
    equals `applyAlg(solved(), scramble)`. This proves target-invariance.
  - Empties to `[]` exactly when the scramble is applied cleanly.
- `quaternion.test.ts`: `mul`/`conjugate`/`toMatrix3d` against known values
  (identity, 90° about an axis).
- `CubeView3D.test.tsx`: render a known state via the simulator path; assert the
  visible sticker colors match the facelet state (no animation/gyro needed in jsdom).
- `SmartCubeSession.test.tsx` (extend): apply a scramble with a deliberate wrong
  move mid-way via the simulator; assert the deviation banner appears and the session
  still reaches "ready" (queue empties) and captures a solve.

## Rollout / sequencing

1. `scramble-queue.ts` + tests (pure; makes scrambling robust immediately).
2. Session integration of the queue (remaining display + deviation banner + ready).
3. `quaternion.ts` + tests.
4. `CubeView3D` (cubelet model + animated turns; fixed angle) + render test.
5. `SmartCube.onOrientation` + `GanCube` gyro mapping + wire gyro/recenter into the view.

Steps 1–2 land the self-correcting scramble on its own; 3–5 add the live 3D cube.
