# Timer page + RU/RUL turn-only trainers

**Date:** 2026-06-19
**Status:** Approved (direction confirmed via clarifying questions)

## Goal

Add a dedicated **Timer page** that works like a speedcube timer (csTimer-style),
with a **menu** to switch between trainers. Among the trainers is a new
**RU turn-only** event (2-gen R,U scrambles) plus an **RUL** (3-gen) event and a
standard **3x3** event.

## Motivation

The app already has scramble-driven trainers (Cross, Look-ahead) and a reusable
spacebar `Timer`, but no plain speedcube timer and no single place to pick what
you're timing. Speedcubers commonly drill 2-gen (R,U) and 3-gen (R,U,L) scrambles
for finger tricks and last-layer practice; csTimer exposes these as selectable
events. This adds that.

## Scope

In scope:
- New scramble generators: `generateRUScramble`, `generateRULScramble`.
- New route `/timer` with a nav entry "Timer".
- A `TimerPage` with a dropdown **menu** to switch the active trainer.
- A reusable `ScrambleTimer` component powering the three new scramble events
  (3x3, RU, RUL): scramble display + spacebar `Timer` + Next + End session +
  Ao5/Ao12 stats.
- Menu also exposes the existing trainers (Cross, Look-ahead, F2L) by rendering
  their existing components — no duplication of their logic.

Out of scope (YAGNI):
- WCA random-state scrambles (keep the existing random-move generator).
- Per-event scramble-length settings UI.
- Persisting the selected event across reloads.
- Replacing or removing the existing `/trainer` tabs page.

## Architecture

### Scramble generation (`src/lib/scramble.ts`)

Extract the existing per-face logic into a shared helper and reuse it:

```
scrambleFromFaces(faces: string[], n: number): string
```

Keeps the existing constraints: never the same face twice in a row, never three
consecutive moves on the same axis. Then:

- `generateScramble(n = 20)` → `scrambleFromFaces(FACES, n)` (unchanged behavior).
- `generateRUScramble(n = 15)` → `scrambleFromFaces(["R", "U"], n)`.
- `generateRULScramble(n = 18)` → `scrambleFromFaces(["R", "U", "L"], n)`.

For RU (axes x, y) the axis-triple rule is moot — moves simply alternate R/U with
random modifiers, a valid 2-gen scramble. For RUL the axis rule prevents
redundant R/L/R-type chains.

### Stats helper (`src/lib/stats.ts`)

Small, tested utilities reused by `ScrambleTimer`:
- `mean(xs: number[]): number`
- `avgOfLast(xs: number[], n: number): string` — `"—"` until `n` solves exist.

(TrainerCross has its own copies; left untouched to keep this change focused.)

### `ScrambleTimer` component (`src/components/ScrambleTimer.tsx`)

Props: `{ title, description, generate: () => string, caseId: string }`.

Renders: title + description, scramble (mono), the existing `Timer`
(`inspection`/`useMs` from profile), "Next scramble" and "End session" buttons,
and Solves / Ao5 / Ao12 stats. On `Timer.onComplete`, push the time; "End session"
calls `addDrill({ caseId, attempts, avgTime })` and resets — same shape as
TrainerCross. Modeled on TrainerCross minus the cross-specific diagram/solution.

### `TimerPage` (`src/pages/TimerPage.tsx`) + routing

- `App.tsx`: add `<Route path="/timer" element={<TimerPage />} />`.
- `Nav.tsx`: add `{ to: "/timer", label: "Timer" }`.
- `TimerPage` holds `useState` for the selected trainer key and renders a styled
  `<select>` menu (with `<optgroup>` "Timers" / "Trainers"), then the matching
  body below it:
  - `3x3` → `<ScrambleTimer title="3x3" generate={() => generateScramble(20)} caseId="timer-3x3" />`
  - `ru` → `<ScrambleTimer title="RU (2-gen)" generate={() => generateRUScramble()} caseId="timer-ru" />`
  - `rul` → `<ScrambleTimer title="RUL (3-gen)" generate={() => generateRULScramble()} caseId="timer-rul" />`
  - `cross` → `<TrainerCross />`
  - `lookahead` → `<TrainerLookahead />`
  - `f2l` → `<TrainerF2L />`

Switching keys remounts the body, so each trainer's state resets cleanly. Only one
`Timer` is mounted at a time, so the global space-key listener never conflicts.

## Data flow

`generate()` → scramble string shown + held in state → user solves on a real cube
→ space starts/stops `Timer` → `onComplete(seconds)` appends to `times` →
Ao5/Ao12 derived from `times` → "End session" persists a drill via `addDrill`.

## Error handling

- Scramble generators are pure and total (bounded retry loop already proven for
  `generateScramble`); no failure path.
- "End session" with zero solves is a no-op (matches TrainerCross).

## Testing

- `scramble.test.ts`: for RU and RUL — correct length, faces restricted to the
  allowed set, no two consecutive same face.
- `stats.test.ts`: `avgOfLast` returns `"—"` below threshold and the rounded mean
  at/above it.
- `TimerPage.test.tsx`: renders the menu; default event scramble contains only
  R/U faces when "RU (2-gen)" selected; switching the menu swaps the body.

## Verification

`npm run typecheck`, `npm test`, then run the app and screenshot `/timer` with the
RU event selected to confirm it renders and times.
