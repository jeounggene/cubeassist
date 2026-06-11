# CubeAssist — F2L Trainer (single-case slice) Design Spec

**Date:** 2026-06-10
**Status:** Approved (user said "just implement")
**Parent spec:** `docs/superpowers/specs/2026-06-05-trainer-practice-modes-design.md`
**Sibling slice:** `docs/superpowers/specs/2026-06-10-cross-trainer-design.md`

## Goal

Add an **F2L trainer** at `/trainer/f2l` that drills the 41 first-two-layers cases.
The user practices on a physical cube: apply the shown setup scramble (which leaves
only the front-right pair in the top layer), execute the F2L algorithm, and time it
with the existing WCA timer. This is the "algo trainer" — the algorithm is shown by
default for study, with a toggle to hide it until after the solve for self-testing.

## Scope decisions (locked)

- **Single-case mode only** this slice: pick one of the 41 cases from a list and
  drill it repeatedly. **Mixed** mode (random case, recognition-focused, name hidden)
  is an explicit follow-up.
- **Algorithm shown by default** with a **"Hide algorithm until solve"** toggle. When
  hidden, the name/alg/recognition are revealed after the timer stops.
- **All 41 cases** for the canonical **front-right (FR)** slot.
- **Standard RU-based algorithm set** (expressed in the 18 basic moves
  `{U,D,L,R,F,B} × {'', "'", "2"}`; no wide/slice/rotations needed for FR-slot algs).
- **Generated 2D case diagram** from a 54-facelet cube model — never hand-authored,
  so it cannot drift from the algorithm.

## Architecture

### Decision 1 — A 54-facelet cube model (`lib/facecube.ts`)

The cross trainer's `lib/cube.ts` tracks edges only, which can't render a corner or
its colors. F2L needs corner + edge stickers, so this slice adds a **separate,
focused 54-facelet model** rather than extending the edge model. Faces are ordered
`U R F D L B`, 9 facelets each, row-major (Kociemba layout), indices:

```
U 0..8   R 9..17   F 18..26   D 27..35   L 36..44   B 45..53
```

`solved()` colors facelet `i` by its face (`U→yellow, R→red, F→green, D→white,
L→orange, B→blue` — Western scheme, white on D / green on F, matching the cross
trainer's color map). Each of the 6 quarter-turns is a fixed facelet permutation;
`2`/`'` derive from it. The cross trainer is untouched; the two pure models coexist,
each small and independently tested.

```ts
export type Facelets = number[];           // 54 entries, color id 0..5
export function solved(): Facelets;
export function applyAlg(state: Facelets, alg: string): Facelets;
export function invertAlg(alg: string): string;   // "R U R'" -> "R U' R'"
```

### Decision 2 — F2L content derived from the algorithm

Each of the 41 cases authors only `{ id, name, group, algorithm, recognition }`
(the existing `{id,name}` in `f2l.json` is enriched in place; `Profile.tsx` ignores
the new fields). Everything else is derived:

- **setup scramble** = `invertAlg(algorithm)`
- **case diagram** = `applyAlg(solved(), setup)`

Because the diagram applies the *inverse of the solving alg* to a solved cube, it is
always consistent with the algorithm. A clean FR-slot F2L alg's inverse-setup leaves
the cross and the other three slots solved and lifts only the FR pair into the U
layer — exactly the trainer premise.

### Decision 3 — The case diagram (oblique F2L view)

`CubeF2LDiagram` renders the conventional F2L view from the derived facelets:
- the **U face** as a 3×3 grid (facelets 0–8),
- the **F-face top row** (18,19,20) folded below it,
- the **R-face top row** (9,10,11) folded to its right.

Colors come straight from the facelet color ids. This is enough to recognize any
F2L case (the pair pieces sit in the U layer / FR column).

## Routes

| Route | View |
|---|---|
| `/trainer` | Cross trainer (unchanged this slice) |
| `/trainer/f2l` | F2L trainer (new) |

`App.tsx` already mounts `/trainer/*`. Inside the Trainer area we add nested routing:
`/trainer` → cross trainer, `/trainer/f2l` → F2L trainer, plus a small set of links
between them. (A full three-card Trainer landing page stays deferred to the parent
spec; this slice only needs the two routes reachable.)

## F2L trainer page (`/trainer/f2l`)

**Controls:**
- **Case picker** — a list/grid of the 41 cases grouped by `group`
  (e.g. "Pair joined on top", "Corner in slot", "Edge in slot", "Pieces separated").
  Selecting one loads it.
- **"Hide algorithm until solve"** checkbox (default off = shown).

**Per-rep flow:**
1. Show the selected case: **setup scramble** (WCA notation), the **2D diagram**, the
   case **name** + **group**, and — unless hidden — the **algorithm** + **recognition**.
2. The user applies the setup to a solved cube (only the FR pair is now up), solves
   the pair, and times it with the WCA `Timer`.
3. After the timer stops: if the algorithm was hidden, reveal name/alg/recognition now.
4. Running **Ao5 / Ao12** for the current case; "Next rep" re-arms the same case.

**Persistence:** on "End session", append a `DrillRecord`
`{ date, caseId: <f2l case id>, attempts, avgTime }` to `profile.drillHistory`
(schema unchanged), reusing the existing `addDrill`.

## Modules & boundaries

| File | Responsibility | Pure? |
|---|---|---|
| `src/lib/facecube.ts` | 54-facelet model: `solved`, `applyAlg`, `invertAlg`; the 6 face permutations | yes |
| `src/lib/f2l.ts` | load the 41 cases; `caseSetup(c)=invertAlg(c.algorithm)`; `caseFacelets(c)=applyAlg(solved(),setup)`; group helpers | yes |
| `src/data/cases/f2l.json` | enriched in place: add `{ group, algorithm, recognition }` to all 41 (existing `{id,name}` preserved/improved) | data |
| `src/components/CubeF2LDiagram.tsx` | oblique F2L SVG/grid view from facelets | view |
| `src/pages/TrainerF2L.tsx` | the F2L trainer page | view |
| `src/pages/Trainer.tsx` | nested routes: cross at `/trainer`, F2L at `/trainer/f2l` | view |
| `src/components/Timer.tsx` | reused unchanged | view |

## Testing strategy

**Unit (Vitest):**
- `facecube.ts`
  - `solved()` has 9 of each color.
  - `R` applied 4× = identity; sexy `R U R' U'` applied 6× = identity.
  - `invertAlg("R U R'") === "R U' R'"`; `applyAlg(applyAlg(s,a),invertAlg(a)) === s`.
- **F2L data correctness — the key guard.** For **every** of the 41 cases:
  - round-trip: `applyAlg(applyAlg(solved(), setup), algorithm) === solved()`
    where `setup = invertAlg(algorithm)`.
  - clean FR-slot: applying `setup` to `solved()` leaves every facelet equal to
    solved **except** the U face (0–8) and the FR-slot facelets (the DFR corner's
    U/F/R/D stickers and the FR edge's F/R stickers). This proves each authored alg
    is a clean FR-slot F2L alg (cross + the other three slots untouched).
  - **distinctness:** the 41 derived facelet states are pairwise distinct (so the set
    is exactly the 41 real F2L cases, no duplicates/omissions).
- `f2l.ts` — `caseSetup` returns the inverse of the algorithm; `caseFacelets` matches
  `applyAlg(solved(), setup)`.

**Component (React Testing Library):**
- `TrainerF2L` — selecting a case shows its setup scramble; the algorithm is hidden
  when "Hide algorithm until solve" is checked and shown otherwise.
- `CubeF2LDiagram` — renders 9 U-face cells + the two folded rows with the expected
  accessible label.

## Out of scope (this slice)

- **Mixed** mode (random case, recognition-focused).
- The three-card Trainer landing page (parent spec).
- OLL/PLL/full-solve trainers; an F2L *solver* (algs are authored, not searched).
- Animated move-by-move walkthroughs (Library's job).
- Per-case scramble banks (setup is derived from the alg, not curated).

## Risks

- **Authoring 41 correct FR-slot algs** is the main risk. The round-trip + clean-slot
  + distinctness tests are the guard: any wrong or duplicate alg fails a test, giving
  a tight TDD loop. Expect to iterate the JSON until all three tests are green.
- **54-facelet permutations** must be exact; `R⁴ = I` and sexy `×6 = I` catch errors.

## Open questions

None — proceeding to implementation.
