# CubeAssist — Cross Trainer (cross-first slice) Design Spec

**Date:** 2026-06-10
**Status:** Approved (brainstorming complete)
**Parent spec:** `docs/superpowers/specs/2026-06-05-trainer-practice-modes-design.md`

## Goal

Ship the **Cross trainer** as the first working slice of the Trainer area. This is
a scoped subset of the parent trainer spec: it builds only the Cross mode plus the
minimum shared infrastructure that mode needs, and adds one feature the parent spec
deferred — an optional **optimal-solution reveal after the solve**.

The user practices on a **physical cube** with an on-screen WCA-style timer. The app
shows a scramble and the target cross color; the user solves only the cross.

## Scope decisions (locked during brainstorming, 2026-06-10)

- **Cross trainer only.** No F2L, no Look-ahead, no Trainer landing page this pass.
  `/trainer` renders the Cross trainer directly.
- **White cross only.** Fixed white bottom. Color-neutral (random color) is an
  explicit immediate follow-up, not part of this slice.
- **Reveal optimal solution after solve.** The parent spec shows no solution; this
  slice adds a "Show optimal solution" button that appears only *after* the timer
  stops, so the drill stays blind. The solution is reconstructed from the exact
  BFS distance table (guaranteed shortest length).
- **Edge-only cube model.** The parent spec's full 54-facelet `cube.ts` is deferred
  to the F2L pass. The cross only needs the 12 edges, so this slice builds an
  edge-only model.

## Routes

| Route | View |
|---|---|
| `/trainer` | Cross trainer (`TrainerCross`) |
| `/trainer/*` | Same (App already mounts `/trainer/*`) |

When F2L / Look-ahead arrive, `/trainer` becomes the landing page and the Cross
trainer moves to `/trainer/cross` (per the parent spec). Not this pass.

## Modules & boundaries

| File | Responsibility | Pure? |
|---|---|---|
| `src/lib/cube.ts` | Edge-only model: 12 edges as `{ perm: number[12], ori: number[12] }`; the 6 face quarter-turns as fixed permutations; `parseMoves(s)`, `applyScramble(state, s)`, `invertScramble(s)`. | yes |
| `src/lib/cross.ts` | White-cross coordinate over the 4 D-layer edges (position + flip); BFS distance table from the solved-cross state (distances 0–8); `optimalCrossLength(scramble)`; `solveCross(scramble)` → one optimal move list via greedy descent on the table. | yes |
| `src/lib/scramble.ts` | `generateScramble(n=20)` — WCA-legal (no two consecutive same-face, no three consecutive same-axis); `generateCrossScramble(targetLen)` — retry random scrambles until `optimalCrossLength === targetLen` (bounded retries, throws if exhausted). | yes* |
| `src/components/Timer.tsx` | WCA spacebar timer: hold space → "ready" turns green after 0.55s → release starts → any key stops. Reads `settings.inspection` and `settings.useMs` from the profile. | view |
| `src/components/CubeDiagram.tsx` | Minimal bottom-face cross glyph in the target color (indicates which cross to solve). White-only this pass; color prop kept for the color-neutral follow-up. | view |
| `src/pages/Trainer.tsx` | Replaced: renders the Cross trainer. | view |
| `src/pages/TrainerCross.tsx` | The Cross trainer page (controls + flow below). | view |

\* `scramble.ts` uses `Math.random()` so it isn't deterministic, but every output is
property-testable (length, no illegal sequences, cross length matches target).

### Edge model (`lib/cube.ts`)

12 edges indexed `0..11` in a fixed order (e.g. UF, UR, UB, UL, DF, DR, DB, DL, FR,
FL, BR, BL). `solved()` = identity perm, all orientations `0`. Each of `U D L R F B`
is a quarter-turn permutation of the 12 edge slots plus an orientation flip mask.
The exact flip convention is an implementation detail pinned down by the tests
(`R`×4 = identity, sexy×6 = identity, and `solveCross` actually solving); the
standard F/B-relative convention — `F`/`B` quarter-turns flip the 4 edges they
cycle, `U`/`D`/`L`/`R` do not — is the expected choice. `'` = inverse, `2` = applied twice. `parseMoves` accepts the 18 standard
moves `{U,D,L,R,F,B} × {'', "'", "2"}` — no wide/slice/rotation needed for cross.

### Cross model (`lib/cross.ts`)

The white cross = the 4 edges whose home slots are the D-layer slots (DF, DR, DB, DL).
A cross **coordinate** encodes, for each of those 4 pieces, its current slot (0–11)
and flip (0/1). BFS from the solved-cross coordinate over the 18 moves builds a
`Map<coord, distance>` once (module-level, memoized); max distance ≤ 8.

- `optimalCrossLength(scramble)` — apply scramble to `solved()`, read the 4 cross
  pieces' (slot, flip), encode the coordinate, look up the distance.
- `solveCross(scramble)` — from the scrambled coordinate, repeatedly pick any of the
  18 moves whose resulting coordinate has a strictly smaller table distance; append
  it; repeat until distance 0. The move list length equals the optimal length, so it
  is a shortest solution. (Ties broken by a fixed move order for determinism.)

## Cross trainer page (`/trainer`)

**Controls:**
- **Difficulty** — segmented selector `2 · 3 · 4 · 5 · 6 · 7 · 8` (optimal cross
  length). Default 4.
- (Color selector is present but fixed to White this pass; the Random option is
  the color-neutral follow-up.)

**Per-rep flow:**
1. `generateCrossScramble(difficulty)` produces a scramble whose optimal cross
   length equals the chosen difficulty.
2. Show the scramble (WCA notation) + a small white bottom-face cross glyph.
3. User applies the scramble to a solved cube and solves only the cross; the WCA
   timer records the time.
4. After the timer stops: a **"Show optimal solution"** button appears. Clicking it
   reveals `solveCross(scramble)` (one optimal sequence). Hidden again on the next
   scramble.
5. Running **Ao5 / Ao12** shown in-session. "Next scramble" advances.

**Session end → persistence:** append a `DrillRecord` to `profile.drillHistory`:
`{ date, caseId: "cross", attempts, avgTime }` (schema unchanged). No history viewer
in this pass — that is the Dashboard's job later.

## Testing strategy

**Unit (Vitest):**
- `cube.ts` — `solved()` is identity; `R` applied 4× = identity; sexy `R U R' U'`
  applied 6× = identity; `applyScramble(applyScramble(s, a), invertScramble(a))` === `s`.
- `cross.ts` — `optimalCrossLength("")` (solved) = 0; a single quarter turn that
  displaces a cross edge ≥ 1; the BFS table's max distance ≤ 8 and covers all
  reachable states; `solveCross(scr)` applied after `scr` leaves all 4 cross edges
  home+oriented, and its length equals `optimalCrossLength(scr)`.
- `scramble.ts` — `generateScramble(n)` returns `n` moves, never two consecutive
  same-face, never three consecutive same-axis; `generateCrossScramble(k)` returns a
  scramble with `optimalCrossLength === k` for every `k` in 2..8.

**Component (React Testing Library):**
- `Timer` — spacebar hold → ready → start → stop yields a positive time; honors
  `inspection` off.
- `TrainerCross` — selecting a difficulty renders a scramble; the "Show optimal
  solution" button is absent before a solve and present after.

## Out of scope (this slice)

- Color-neutral / random cross color (immediate follow-up).
- F2L and Look-ahead trainers and the Trainer landing page.
- Full 54-facelet cube model (F2L pass).
- Cross-session drill-history viewer / charts (Dashboard's job).

## Open questions

None — scope locked during brainstorming.
