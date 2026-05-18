# CubeAssist — Design Spec

**Date:** 2026-05-14
**Status:** Approved (brainstorming complete)

## Goal

A static web app that helps speedcubers improve at the CFOP method by:
1. Capturing the user's current level (stage times + which algorithms they've memorized).
2. Recommending the next best thing to learn — including bundled sessions that combine multiple algorithms across stages.
3. Drilling those recommendations with case-specific scrambles, a WCA-style timer, and cube diagrams.
4. Serving as a reference library for every CFOP algorithm with detailed notation, diagrams, and step-by-step tutorials.

Scope is **2-look OLL/PLL + full CFOP** (no beginner method, no other methods like Roux/ZZ).

## Tech Stack

- **Vite + React + TypeScript** — SPA, no SSR.
- **Tailwind CSS** for styling.
- **react-router-dom** for client-side routing.
- **sr-visualizer** (or equivalent small SVG library) for cube diagrams — must accept arbitrary cube states.
- **localStorage** for all persistence. No backend, no auth.
- Deployable as a static bundle (Netlify / Vercel / GitHub Pages compatible).

## Architecture

Single-page React app with four primary views:

1. **Dashboard** (`/`) — stage times, completion %, headline "Next Best Step" recommendation card, recent drill history.
2. **Profile** (`/profile`) — time inputs and algorithm checklists. Where the user updates state.
3. **Trainer** (`/trainer/:caseId` or `/trainer/full-solve`) — drilling sessions with scrambles, timer, and case diagrams.
4. **Library** (`/library`, `/library/:caseId`) — browsable reference for every case. Each case has its own detail/tutorial page.

A **notation primer** page (`/notation`) explains move syntax. Linked contextually from any unfamiliar move.

## Data Model

A single `UserProfile` JSON object stored in `localStorage` under key `cubeassist:profile:v1`.

```ts
type UserProfile = {
  schemaVersion: 1;
  times: {
    cross: StageTime;
    f2l:   StageTime;
    oll:   StageTime;
    pll:   StageTime;
  };
  known: {
    f2l:      Record<string, boolean>;   // 41 cases, IDs "f2l-01" through "f2l-41"
    oll2look: Record<string, boolean>;   // 10 algs: 3 edge-orientation + 7 corner-orientation
    pll2look: Record<string, boolean>;   // 6 algs: 4 edge perms (Ua, Ub, Z, H) + 2 corner perms (Aa, E)
    oll:      Record<string, boolean>;   // 57 cases, IDs "OLL-01" .. "OLL-57"
    pll:      Record<string, boolean>;   // 21 cases, IDs by name "PLL-Aa", "PLL-Ab", ..., "PLL-V"
  };
  drillHistory: DrillRecord[];
  settings: {
    inspection: boolean;   // 15s WCA inspection on/off
    useMs: boolean;        // show milliseconds in times
  };
};

type StageTime = {
  avg: number | null;             // rolling average of `samples` (seconds)
  samples: number[];              // last 12 entries, FIFO
};

type DrillRecord = {
  date: string;                   // ISO date "YYYY-MM-DD"
  caseId: string;                 // e.g., "PLL-T"
  attempts: number;
  avgTime: number;                // seconds
};
```

The schema version supports future migrations. The whole profile is exportable/importable via JSON download/upload — explicit user action, not part of MVP unless trivial to add.

## Recommendation Engine

Runs on every dashboard render. Input: `UserProfile`. Output: a ranked list of `Recommendation` objects, top one is the headline.

**Step 1 — Find the bottleneck stage.** Each stage gets a tier based on its `avg` against benchmarks:

| Stage | Beginner | Intermediate | Advanced | Expert |
|-------|----------|--------------|----------|--------|
| Cross | >6s      | 4–6s         | 2–4s     | <2s    |
| F2L   | >20s     | 12–20s       | 7–12s    | <7s    |
| OLL   | >5s      | 3–5s         | 2–3s     | <2s    |
| PLL   | >5s      | 3–5s         | 2–3s     | <2s    |

Tier values: `beginner=0, intermediate=1, advanced=2, expert=3`. Each stage's **gap** = `maxTier - stageTier`. The stage with the largest gap is the bottleneck.

Tie-breaking order (when gaps are equal): PLL > OLL > F2L > Cross (the stages with the biggest impact-per-alg-learned come first).

**Step 2 — Pick algorithms inside the bottleneck stage.** Each stage has a canonical learning order in a config JSON. Walk it, find the first 1–3 IDs where `known[stage][id] === false`.

**Step 3 — Build a bundled session.** Combine picks into a single recommendation:

```ts
type Recommendation = {
  id: string;                     // stable hash of contents
  headline: string;               // "Learn T-perm + U-perm (Ua)"
  rationale: string;              // "PLL is your slowest stage. T-perm is the most common case; U-perm shares the same trigger."
  durationMinutes: number;        // 10 / 15 / 20
  items: RecommendationItem[];    // 1–3 algorithms
  drillMode: "single" | "mixed" | "full-ll";
};

type RecommendationItem = {
  caseId: string;
  stage: "cross" | "f2l" | "oll2look" | "pll2look" | "oll" | "pll";
  reason: string;                 // "Most common PLL case (~1/18 solves)"
};
```

**Step 4 — Override rules** (applied in order; first match wins):

0. **Cold start.** If any stage has `times[stage].avg === null`, the headline recommendation is "Enter your times" and routes to `/profile`. No algorithm picks until at least one time per stage exists.
1. **2-look completion required.** If `pll2look` has any unchecked AND user is attempting full PLL — force the next unchecked 2-look PLL alg ahead. Same for OLL.
2. **Polish over expansion.** If a stage's avg is in the "expert" tier but its checklist isn't 100% — recommend filling gaps with recognition + execution drills instead of jumping to another stage.
3. **Cross-stage pairing.** If two stages are tied for bottleneck and both have gaps, build a `drillMode: "full-ll"` session (one OLL + one PLL drilled consecutively).
4. **Fully consolidated.** If every alg is checked AND times are even across stages — suggest refinement drills (lookahead, finger tricks, full-solve practice). MVP: a static set of refinement tips, not a generated drill.

## Trainer

Route: `/trainer/:caseId` (single-case), `/trainer/mixed?cases=...` (mixed-case), `/trainer/full-solve` (whole solve).

**Layout:**
- Top bar: scramble in WCA notation + "next scramble" button.
- Center: large cube diagram of the scrambled state, smaller diagram of the target solved state (or target last-layer pattern).
- Below center: timer display. Space-bar interaction (WCA-style: hold space to "ready" — turns green after 0.55s — release to start, any key to stop).
- Right panel: algorithm card — notation, recognition cues, fingertrick hints, case name.

**Single-case drill flow:**
1. Load 20 scrambles from `data/scrambles/<caseId>.json`, shuffle.
2. User solves; time recorded.
3. After every 5 solves: show running Ao5/Ao12, prompt continue or end.
4. On session end: append a `DrillRecord` to `drillHistory`.

**Mixed-case drill:** Same flow but each scramble can come from any of the listed case banks. Recognition is the focus, so we *don't* show the target case until after the solve.

**Full-solve practice:** Generate a WCA scramble (25 random moves, no two consecutive on the same axis face). Time across all stages — user can press stage hotkeys (1/2/3/4) to mark stage transitions, splitting the solve into cross/F2L/OLL/PLL components. Or they just record total time.

**Scramble generation:**
- **WCA scrambles** — programmatic. 25 moves, faces `{U,D,L,R,F,B}`, modifiers `{'', "'", "2"}`, with the rule that two consecutive moves can't be on the same face and three consecutive moves can't be on the same axis (e.g., R then L then R is disallowed).
- **Case-specific scrambles** — pre-curated banks in `src/data/scrambles/<caseId>.json`, each a list of 20 strings. Sourced from speedcubing community references.

## Library

Route: `/library` shows tabs `Cross | F2L | OLL | PLL`. OLL and PLL tabs include a "2-look" subsection at the top.

**Card grid:** each case is a card showing the case diagram, name, primary algorithm in notation, and a status pill (`☐ Not learned` / `📖 Learning` / `✅ Known`).

Status derivation (computed at render time, not stored):
- `Not learned` — `known[stage][id] === false` AND no `drillHistory` entries for this `caseId`.
- `Learning` — at least one `drillHistory` entry exists for this `caseId`, but either `known === false` OR the most recent drill's `avgTime > 2 ×` the expert-tier benchmark for the stage.
- `Known` — `known[stage][id] === true` AND the most recent `drillHistory` entry for this `caseId` has `avgTime ≤ 2 ×` the expert-tier benchmark for the stage.

The "2× expert benchmark" threshold uses per-stage values from `benchmarks.json` (e.g., PLL expert = <2s, so a case is `Known` when its drill avg ≤ 4s).

**Detail / tutorial page** (`/library/:caseId`):
- Case diagram + solved-state diagram.
- Primary algorithm + up to 3 alternates with usage notes.
- **Notation breakdown** — each move expanded inline (e.g., `R` → "right face 90° clockwise").
- Recognition cues.
- Fingertrick hints (text only, no video).
- **Step-by-step walkthrough** — each move shown with before/after diagrams; brief text explaining what that move accomplishes ("R U R' sets up the corner-edge pair…").
- "Drill this case" button → routes to `/trainer/:caseId`.

## Notation Primer

Static page at `/notation`. Sections:
- Face letters: U, D, L, R, F, B — each with a diagram.
- Modifiers: `'` (counter-clockwise), `2` (180°).
- Wide moves: `Rw` or `r` (two layers).
- Slice moves: M, E, S.
- Rotations: x, y, z.
- Triggers: common combos (e.g., "Sexy move" = R U R' U').

Linked contextually from any algorithm using a non-basic move.

## Content Bundled with the App

Committed as JSON in `src/data/`:

- `cases/cross.json` — patterns for cross practice (not individual algs, but tips and color-neutrality drills).
- `cases/f2l.json` — 41 F2L cases with diagrams data, algorithms, recognition cues.
- `cases/oll2look.json` — 10 algs.
- `cases/pll2look.json` — 6 algs.
- `cases/oll.json` — 57 algs.
- `cases/pll.json` — 21 algs.
- `scrambles/<caseId>.json` — 20 scrambles per case (for the cases that need drilling).
- `learning-order/<stage>.json` — flat ordered array of case IDs for the recommendation engine, e.g., `["PLL-T", "PLL-Y", "PLL-Ja", "PLL-Jb", ...]`. The engine walks this in order and picks the first unchecked entries.
- `benchmarks.json` — the tier thresholds for each stage.

## Component / Module Boundaries

- `src/lib/profile.ts` — load/save `UserProfile`, schema migrations, derive Ao5/Ao12.
- `src/lib/recommend.ts` — pure function `recommend(profile): Recommendation[]`. No side effects, easy to unit test.
- `src/lib/scramble.ts` — `generateWcaScramble()`, `getCaseScrambles(caseId)`.
- `src/lib/notation.ts` — parse/explain a notation string (used by the notation breakdown UI).
- `src/components/CubeDiagram.tsx` — wraps `sr-visualizer`, accepts a cube state or an alg-from-solved string.
- `src/components/Timer.tsx` — WCA-style space-bar timer.
- `src/components/AlgorithmCard.tsx` — the reusable card used in Library and Trainer.
- `src/pages/Dashboard.tsx`, `Profile.tsx`, `Trainer.tsx`, `Library.tsx`, `LibraryDetail.tsx`, `Notation.tsx`.

Each `lib` module is a pure-ish unit with a narrow interface — unit-testable in isolation.

## Testing Strategy

- **Unit tests** (Vitest):
  - `recommend.ts` — every override rule has its own test case (no 2-look done → forces 2-look; expert tier with gaps → polish recommendation; tied bottlenecks → full-LL bundle; everything done → refinement tips).
  - `scramble.ts` — WCA generator never produces consecutive same-face moves, output is the expected length.
  - `notation.ts` — parses every move syntax we support.
  - `profile.ts` — round-trips through localStorage, handles missing keys gracefully, migrations work.
- **Component tests** (React Testing Library): Timer behaves correctly with space-bar; Profile inputs update localStorage; Library status pill reflects `known` state.
- **No E2E in MVP.** Static site, simple flows — unit + component coverage is enough.

## Out of Scope (MVP)

- Cloud sync / accounts / login.
- Mobile native apps.
- Video tutorials or community-uploaded algs.
- Other methods (Roux, ZZ, OH-specific algs).
- Bluetooth smart-cube integration.
- Social features (sharing, leaderboards).
- Color-scheme customization beyond the default Western color scheme.
- Profile export/import (can be added later — the schema is already structured for it).

## Open Questions

None for MVP — all design choices are locked.
