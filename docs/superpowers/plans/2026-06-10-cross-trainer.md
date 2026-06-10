# Cross Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Cross trainer at `/trainer` — a physical-cube practice mode that generates a white-cross scramble of a chosen optimal difficulty (2–8 movers), times the solve with a WCA spacebar timer, shows live Ao5/Ao12, and reveals one optimal cross solution after the solve.

**Architecture:** Three pure libraries plus three view components. `lib/cube.ts` is a 12-edge facelet-free cube model (permutation + orientation of edges only). `lib/cross.ts` builds a BFS distance table over the 4 white-cross edges from that model and exposes `optimalCrossLength` + `solveCross`. `lib/scramble.ts` generates WCA-legal scrambles and filters them by cross length. The views are a WCA `Timer`, a minimal `CubeDiagram`, and the `TrainerCross` page wired into the existing `Trainer` route. Drill results append to the existing `profile.drillHistory`.

**Tech Stack:** Vite + React 19 + TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), Tailwind, Vitest + Testing Library. Reference spec: `docs/superpowers/specs/2026-06-10-cross-trainer-design.md`.

**TypeScript house rules (this repo):**
- Type-only imports MUST use `import type { ... }` (`verbatimModuleSyntax`).
- No `enum` / `namespace` / parameter properties (`erasableSyntaxOnly`) — use plain `const` objects/arrays.
- No unused locals or params (`noUnusedLocals`, `noUnusedParameters`).
- Import local modules without file extensions, matching existing code (`import { x } from "./y"`).

---

## File map

```
src/
  lib/
    cube.ts          (new) 12-edge model: solved(), MOVES, applyScramble(), invertScramble()
    cube.test.ts     (new)
    cross.ts         (new) BFS table, optimalCrossLength(), solveCross()
    cross.test.ts    (new)
    scramble.ts      (new) generateScramble(), generateCrossScramble()
    scramble.test.ts (new)
    profile.ts       (modify) add appendDrillRecord()
    profile.test.ts  (modify) add appendDrillRecord tests
  state/
    ProfileProvider.tsx (modify) add addDrill() to context
  components/
    Timer.tsx        (new) WCA spacebar timer
    Timer.test.tsx   (new)
    CubeDiagram.tsx  (new) minimal bottom-face cross glyph
  pages/
    Trainer.tsx        (modify) render <TrainerCross/>
    TrainerCross.tsx   (new) the cross trainer page
    TrainerCross.test.tsx (new)
```

Each `lib/*` file is a pure module with a narrow interface. `cross.ts` and `scramble.ts` import from `cube.ts`; views import from the libs. `cube.ts` has no imports from the rest of the app.

---

### Task 1: `lib/cube.ts` — 12-edge cube model (TDD)

**Files:**
- Create: `src/lib/cube.ts`
- Test: `src/lib/cube.test.ts`

The model tracks the 12 edges as a permutation (`perm[i]` = which original edge piece sits in slot `i`) plus orientation (`ori[i]` = 0/1 flip of the piece in slot `i`). Slot order is fixed:

```
0 UF  1 UR  2 UB  3 UL  4 DF  5 DR  6 DB  7 DL  8 FR  9 FL  10 BR  11 BL
```

The 6 face quarter-turns (clockwise, viewed from outside the face) are these edge 4-cycles (`[a,b,c,d]` means the piece at slot `a` moves to slot `b`, `b`→`c`, `c`→`d`, `d`→`a`). `F` and `B` flip the orientation of the edges they move; `U D R L` do not (standard F/B-relative convention):

```
U [0,3,2,1] no flip      D [4,5,6,7] no flip
R [1,10,5,8] no flip     L [3,9,7,11] no flip
F [0,8,4,9] flip         B [2,11,6,10] flip
```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/cube.test.ts
import { describe, it, expect } from "vitest";
import { solved, applyScramble, invertScramble } from "./cube";

const isSolved = (s: ReturnType<typeof solved>) =>
  s.perm.every((p, i) => p === i) && s.ori.every((o) => o === 0);

describe("cube edge model", () => {
  it("solved() is the identity state", () => {
    const s = solved();
    expect(s.perm).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(s.ori).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("applying R four times is the identity", () => {
    expect(isSolved(applyScramble(solved(), "R R R R"))).toBe(true);
  });

  it("applying each face four times is the identity", () => {
    for (const f of ["U", "D", "R", "L", "F", "B"]) {
      expect(isSolved(applyScramble(solved(), `${f} ${f} ${f} ${f}`))).toBe(true);
    }
  });

  it("sexy move (R U R' U') applied six times is the identity", () => {
    const sexy = "R U R' U' ".repeat(6);
    expect(isSolved(applyScramble(solved(), sexy))).toBe(true);
  });

  it("X2 equals X X for every face", () => {
    for (const f of ["U", "D", "R", "L", "F", "B"]) {
      const a = applyScramble(solved(), `${f}2`);
      const b = applyScramble(solved(), `${f} ${f}`);
      expect(a).toEqual(b);
    }
  });

  it("invertScramble reverses and inverts each move", () => {
    expect(invertScramble("R U R'")).toBe("R U' R'");
    expect(invertScramble("F2 D' L")).toBe("L' D F2");
  });

  it("a scramble followed by its inverse is the identity", () => {
    const scr = "R U2 F' D L2 B";
    const s = applyScramble(solved(), scr);
    expect(isSolved(applyScramble(s, invertScramble(scr)))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/cube.test.ts`
Expected: FAIL — "Cannot find module './cube'".

- [ ] **Step 3: Implement `src/lib/cube.ts`**

```ts
// src/lib/cube.ts
// A facelet-free Rubik's cube model that tracks only the 12 edges.
// Slot order: 0 UF 1 UR 2 UB 3 UL 4 DF 5 DR 6 DB 7 DL 8 FR 9 FL 10 BR 11 BL

export type EdgeState = { perm: number[]; ori: number[] };

export type MoveSpec = {
  name: string; // e.g. "R", "R2", "R'"
  dest: number[]; // dest[s] = slot the piece at slot s moves to
  flip: boolean[]; // flip[s] = piece leaving slot s has its orientation flipped
};

const EDGE_COUNT = 12;

// Clockwise quarter-turn 4-cycles (viewed from outside the face) + flip flag.
const QUARTERS: { face: string; cycle: number[]; flip: boolean }[] = [
  { face: "U", cycle: [0, 3, 2, 1], flip: false },
  { face: "D", cycle: [4, 5, 6, 7], flip: false },
  { face: "R", cycle: [1, 10, 5, 8], flip: false },
  { face: "L", cycle: [3, 9, 7, 11], flip: false },
  { face: "F", cycle: [0, 8, 4, 9], flip: true },
  { face: "B", cycle: [2, 11, 6, 10], flip: true },
];

function identityPerm(): number[] {
  return Array.from({ length: EDGE_COUNT }, (_, i) => i);
}

function composePerm(first: number[], second: number[]): number[] {
  // apply `first`, then `second`: result[s] = second[first[s]]
  return first.map((_, s) => second[first[s]]);
}

function invertPerm(p: number[]): number[] {
  const inv = new Array<number>(EDGE_COUNT);
  for (let s = 0; s < EDGE_COUNT; s++) inv[p[s]] = s;
  return inv;
}

function quarterDest(cycle: number[]): number[] {
  const dest = identityPerm();
  const [a, b, c, d] = cycle;
  dest[a] = b;
  dest[b] = c;
  dest[c] = d;
  dest[d] = a;
  return dest;
}

function buildMoves(): MoveSpec[] {
  const moves: MoveSpec[] = [];
  for (const q of QUARTERS) {
    const dest1 = quarterDest(q.cycle);
    const flip1 = new Array<boolean>(EDGE_COUNT).fill(false);
    if (q.flip) for (const s of q.cycle) flip1[s] = true;

    // quarter
    moves.push({ name: q.face, dest: dest1, flip: flip1 });
    // double: two quarters; orientation flips cancel
    moves.push({
      name: `${q.face}2`,
      dest: composePerm(dest1, dest1),
      flip: new Array<boolean>(EDGE_COUNT).fill(false),
    });
    // prime: inverse quarter; same slots flip once (odd)
    moves.push({ name: `${q.face}'`, dest: invertPerm(dest1), flip: flip1.slice() });
  }
  return moves;
}

export const MOVES: MoveSpec[] = buildMoves();

const MOVE_BY_NAME = new Map<string, MoveSpec>(MOVES.map((m) => [m.name, m]));

export function solved(): EdgeState {
  return { perm: identityPerm(), ori: new Array<number>(EDGE_COUNT).fill(0) };
}

export function applyMoveSpec(state: EdgeState, spec: MoveSpec): EdgeState {
  const perm = new Array<number>(EDGE_COUNT);
  const ori = new Array<number>(EDGE_COUNT);
  for (let s = 0; s < EDGE_COUNT; s++) {
    const to = spec.dest[s];
    perm[to] = state.perm[s];
    ori[to] = spec.flip[s] ? state.ori[s] ^ 1 : state.ori[s];
  }
  return { perm, ori };
}

export function applyScramble(state: EdgeState, scramble: string): EdgeState {
  let cur = state;
  for (const token of scramble.trim().split(/\s+/)) {
    if (!token) continue;
    const spec = MOVE_BY_NAME.get(token);
    if (!spec) throw new Error(`Unknown move: ${token}`);
    cur = applyMoveSpec(cur, spec);
  }
  return cur;
}

export function invertScramble(scramble: string): string {
  const tokens = scramble.trim().split(/\s+/).filter(Boolean);
  const invertToken = (t: string): string => {
    if (t.endsWith("2")) return t;
    if (t.endsWith("'")) return t.slice(0, -1);
    return `${t}'`;
  };
  return tokens.reverse().map(invertToken).join(" ");
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/cube.test.ts`
Expected: PASS (7 tests). If "sexy ×6" or "X four times" fail, a `cycle`/`flip` entry is wrong — re-check the table above against the slot order.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube.ts src/lib/cube.test.ts
git commit -m "feat(cube): 12-edge cube model with move application + inversion"
```

---

### Task 2: `lib/cross.ts` — BFS table, `optimalCrossLength`, `solveCross` (TDD)

**Files:**
- Create: `src/lib/cross.ts`
- Test: `src/lib/cross.test.ts`

The white cross = the 4 edge pieces whose home slots are `DF DR DB DL` (slot/piece ids `4,5,6,7`). A cross **coordinate** packs each of those 4 pieces' `(slot, ori)` into a 20-bit integer. BFS from the solved-cross coordinate over the 18 `MOVES` (each cost 1) yields the exact optimal solve length (0–8) for every reachable state.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/cross.test.ts
import { describe, it, expect } from "vitest";
import { optimalCrossLength, solveCross, crossDistanceTable } from "./cross";
import { solved, applyScramble } from "./cube";

const CROSS_PIECES = [4, 5, 6, 7];
const crossSolved = (scramble: string): boolean => {
  const s = applyScramble(solved(), scramble);
  return CROSS_PIECES.every((p) => {
    const slot = s.perm.indexOf(p);
    return slot === p && s.ori[slot] === 0;
  });
};

describe("optimalCrossLength", () => {
  it("is 0 for the solved cube", () => {
    expect(optimalCrossLength("")).toBe(0);
  });

  it("is 0 after a U move (cross is untouched)", () => {
    expect(optimalCrossLength("U")).toBe(0);
  });

  it("is 1 after a single D move", () => {
    expect(optimalCrossLength("D")).toBe(1);
  });

  it("is 1 after a single F move", () => {
    expect(optimalCrossLength("F")).toBe(1);
  });

  it("is 0 after a sexy move (cross preserved)", () => {
    expect(optimalCrossLength("R U R' U'")).toBe(0);
  });
});

describe("crossDistanceTable", () => {
  it("covers a large reachable set with max distance <= 8", () => {
    const table = crossDistanceTable();
    expect(table.size).toBeGreaterThan(100000);
    let max = 0;
    for (const d of table.values()) max = Math.max(max, d);
    expect(max).toBeLessThanOrEqual(8);
  });
});

describe("solveCross", () => {
  it("returns an empty solution for the solved cube", () => {
    expect(solveCross("")).toBe("");
  });

  it("produces an optimal-length solution that actually solves the cross", () => {
    for (const scr of ["D", "F", "R U R' D2 F", "B' L F2 D R", "F R U' L2 B D"]) {
      const sol = solveCross(scr);
      const len = sol === "" ? 0 : sol.split(" ").length;
      expect(len).toBe(optimalCrossLength(scr));
      expect(crossSolved(`${scr} ${sol}`.trim())).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/cross.test.ts`
Expected: FAIL — "Cannot find module './cross'".

- [ ] **Step 3: Implement `src/lib/cross.ts`**

```ts
// src/lib/cross.ts
import { MOVES, solved, applyScramble } from "./cube";
import type { EdgeState } from "./cube";

// Pieces whose home slots form the white (D-layer) cross.
const CROSS_PIECES = [4, 5, 6, 7];

// Pack the 4 cross pieces' (slot, ori) into a single integer: 5 bits each.
function packCoord(slots: number[], oris: number[]): number {
  let coord = 0;
  for (let i = 0; i < 4; i++) {
    const val = (slots[i] << 1) | oris[i]; // slot 0..11, ori 0..1
    coord |= val << (5 * i);
  }
  return coord;
}

function coordOfState(state: EdgeState): number {
  const slots: number[] = [];
  const oris: number[] = [];
  for (const p of CROSS_PIECES) {
    const slot = state.perm.indexOf(p);
    slots.push(slot);
    oris.push(state.ori[slot]);
  }
  return packCoord(slots, oris);
}

const SOLVED_COORD = packCoord(CROSS_PIECES, [0, 0, 0, 0]);

function applyMoveToCoord(coord: number, moveIndex: number): number {
  const spec = MOVES[moveIndex];
  const slots: number[] = [];
  const oris: number[] = [];
  for (let i = 0; i < 4; i++) {
    const val = (coord >> (5 * i)) & 31;
    const slot = val >> 1;
    const ori = val & 1;
    slots.push(spec.dest[slot]);
    oris.push(spec.flip[slot] ? ori ^ 1 : ori);
  }
  return packCoord(slots, oris);
}

let TABLE: Map<number, number> | null = null;

export function crossDistanceTable(): Map<number, number> {
  if (TABLE) return TABLE;
  const table = new Map<number, number>();
  table.set(SOLVED_COORD, 0);
  let frontier = [SOLVED_COORD];
  let dist = 0;
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const coord of frontier) {
      for (let m = 0; m < MOVES.length; m++) {
        const nc = applyMoveToCoord(coord, m);
        if (!table.has(nc)) {
          table.set(nc, dist + 1);
          next.push(nc);
        }
      }
    }
    frontier = next;
    dist++;
  }
  TABLE = table;
  return table;
}

export function optimalCrossLength(scramble: string): number {
  const table = crossDistanceTable();
  const coord = coordOfState(applyScramble(solved(), scramble));
  return table.get(coord) ?? 0;
}

// One optimal cross solution, reconstructed by greedy descent on the table.
export function solveCross(scramble: string): string {
  const table = crossDistanceTable();
  let coord = coordOfState(applyScramble(solved(), scramble));
  let dist = table.get(coord) ?? 0;
  const moves: string[] = [];
  while (dist > 0) {
    for (let m = 0; m < MOVES.length; m++) {
      const nc = applyMoveToCoord(coord, m);
      if (table.get(nc) === dist - 1) {
        moves.push(MOVES[m].name);
        coord = nc;
        dist--;
        break;
      }
    }
  }
  return moves.join(" ");
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/cross.test.ts`
Expected: PASS (9 tests). BFS builds once (~190k states); the file's tests run in well under a second after the table is built.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cross.ts src/lib/cross.test.ts
git commit -m "feat(cross): BFS cross-distance table, optimalCrossLength, solveCross"
```

---

### Task 3: `lib/scramble.ts` — scramble generation (TDD)

**Files:**
- Create: `src/lib/scramble.ts`
- Test: `src/lib/scramble.test.ts`

`generateScramble(n)` returns `n` WCA-legal moves (no two consecutive same-face; no three consecutive same-axis). `generateCrossScramble(targetLen)` retries random scrambles until the optimal cross length matches.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/scramble.test.ts
import { describe, it, expect } from "vitest";
import { generateScramble, generateCrossScramble } from "./scramble";
import { optimalCrossLength } from "./cross";

const AXIS: Record<string, string> = { U: "y", D: "y", L: "x", R: "x", F: "z", B: "z" };
const faceOf = (move: string) => move[0];

describe("generateScramble", () => {
  it("returns the requested number of moves", () => {
    expect(generateScramble(20).split(" ")).toHaveLength(20);
    expect(generateScramble(5).split(" ")).toHaveLength(5);
  });

  it("never repeats a face consecutively, never three same-axis in a row", () => {
    const moves = generateScramble(200).split(" ");
    for (let i = 1; i < moves.length; i++) {
      expect(faceOf(moves[i])).not.toBe(faceOf(moves[i - 1]));
      if (i >= 2) {
        const sameAxis =
          AXIS[faceOf(moves[i])] === AXIS[faceOf(moves[i - 1])] &&
          AXIS[faceOf(moves[i])] === AXIS[faceOf(moves[i - 2])];
        expect(sameAxis).toBe(false);
      }
    }
  });

  it("uses only legal face letters and modifiers", () => {
    for (const m of generateScramble(100).split(" ")) {
      expect(m).toMatch(/^[UDLRFB]('|2)?$/);
    }
  });
});

describe("generateCrossScramble", () => {
  it("produces a scramble with the exact target cross length for 2..8", () => {
    for (let k = 2; k <= 8; k++) {
      const scr = generateCrossScramble(k);
      expect(optimalCrossLength(scr)).toBe(k);
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/scramble.test.ts`
Expected: FAIL — "Cannot find module './scramble'".

- [ ] **Step 3: Implement `src/lib/scramble.ts`**

```ts
// src/lib/scramble.ts
import { optimalCrossLength } from "./cross";

const FACES = ["U", "D", "L", "R", "F", "B"];
const MODIFIERS = ["", "'", "2"];
const AXIS: Record<string, string> = {
  U: "y",
  D: "y",
  L: "x",
  R: "x",
  F: "z",
  B: "z",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateScramble(n = 20): string {
  const moves: string[] = [];
  let prev = "";
  let prev2 = "";
  while (moves.length < n) {
    const face = pick(FACES);
    if (face === prev) continue; // no two consecutive same face
    if (
      prev !== "" &&
      prev2 !== "" &&
      AXIS[face] === AXIS[prev] &&
      AXIS[face] === AXIS[prev2]
    ) {
      continue; // no three consecutive same axis
    }
    moves.push(face + pick(MODIFIERS));
    prev2 = prev;
    prev = face;
  }
  return moves.join(" ");
}

// Retry random scrambles until the optimal white-cross length equals targetLen.
export function generateCrossScramble(targetLen: number, maxTries = 50000): string {
  for (let i = 0; i < maxTries; i++) {
    const scr = generateScramble(20);
    if (optimalCrossLength(scr) === targetLen) return scr;
  }
  throw new Error(`Could not generate a cross scramble of length ${targetLen}`);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/scramble.test.ts`
Expected: PASS (4 tests). The `2..8` loop is the slowest (length 2 is the rarest); it still completes in a few seconds with `maxTries = 50000`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scramble.ts src/lib/scramble.test.ts
git commit -m "feat(scramble): WCA scramble generator + cross-length-targeted scrambles"
```

---

### Task 4: Persist drill records (TDD)

**Files:**
- Modify: `src/lib/profile.ts`, `src/lib/profile.test.ts`
- Modify: `src/state/ProfileProvider.tsx`

- [ ] **Step 1: Add a failing test for `appendDrillRecord`**

Append to `src/lib/profile.test.ts`:

```ts
import { appendDrillRecord } from "./profile";
import type { DrillRecord } from "../types/profile";

describe("appendDrillRecord", () => {
  const rec: DrillRecord = {
    date: "2026-06-10",
    caseId: "cross",
    attempts: 5,
    avgTime: 3.2,
  };

  it("appends a record to drillHistory", () => {
    const p = appendDrillRecord(emptyProfile(), rec);
    expect(p.drillHistory).toHaveLength(1);
    expect(p.drillHistory[0]).toEqual(rec);
  });

  it("does not mutate the input profile", () => {
    const p = emptyProfile();
    const out = appendDrillRecord(p, rec);
    expect(p.drillHistory).toHaveLength(0);
    expect(out).not.toBe(p);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/lib/profile.test.ts`
Expected: FAIL — "appendDrillRecord is not a function".

- [ ] **Step 3: Implement `appendDrillRecord` in `src/lib/profile.ts`**

Add this export at the end of `src/lib/profile.ts`. Ensure `DrillRecord` is imported in that file's type import (extend the existing `import type { ... } from "../types/profile"` to include `DrillRecord`):

```ts
export function appendDrillRecord(
  profile: UserProfile,
  record: DrillRecord,
): UserProfile {
  return { ...profile, drillHistory: [...profile.drillHistory, record] };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/lib/profile.test.ts`
Expected: PASS (all prior profile tests + 2 new).

- [ ] **Step 5: Expose `addDrill` on the profile context**

In `src/state/ProfileProvider.tsx`:

Add `DrillRecord` to the type import and `appendDrillRecord` to the lib import:

```tsx
import type { UserProfile, DrillRecord } from "../types/profile";
import {
  appendDrillRecord,
  appendTimeSample,
  emptyProfile,
  loadProfile,
  saveProfile,
  setKnown,
} from "../lib/profile";
```

Add `addDrill` to the context type (inside `ProfileContextValue`):

```tsx
  addDrill: (record: DrillRecord) => void;
```

Add `addDrill` to the `useMemo` value object:

```tsx
      addDrill: (record) => setProfile((p) => appendDrillRecord(p, record)),
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/profile.ts src/lib/profile.test.ts src/state/ProfileProvider.tsx
git commit -m "feat(profile): appendDrillRecord + addDrill on profile context"
```

---

### Task 5: `components/Timer.tsx` — WCA spacebar timer (TDD)

**Files:**
- Create: `src/components/Timer.tsx`
- Test: `src/components/Timer.test.tsx`

Props-driven (the page passes `inspection`/`useMs` from the profile) so the component is easy to test in isolation. Behavior:
- `inspection === false`: hold Space → after `readyHoldMs` the timer is "ready" (green) → release Space starts the run → any key stops and calls `onComplete(seconds)`.
- Releasing Space before "ready" is a false start → back to idle.
- `inspection === true`: first Space press starts a 15s inspection countdown; the next Space press begins the hold-to-ready, then the run as above.
- `useMs` formats the time with 3 decimals, otherwise 2.

Times come from `performance.now()` so they are exact regardless of render cadence.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Timer.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Timer from "./Timer";

let now = 0;

beforeEach(() => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Timer (inspection off)", () => {
  it("hold -> ready -> start -> stop yields a positive time", () => {
    const onComplete = vi.fn();
    render(<Timer inspection={false} useMs={false} onComplete={onComplete} readyHoldMs={0} />);

    fireEvent.keyDown(window, { code: "Space" }); // begin hold; readyHoldMs=0 => ready
    now = 1000;
    fireEvent.keyUp(window, { code: "Space" }); // start running at t=1000
    now = 4500;
    fireEvent.keyDown(window, { code: "Space" }); // stop at t=4500

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toBeCloseTo(3.5, 3);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("3.50");
  });

  it("releasing Space before ready is a false start (no time recorded)", () => {
    const onComplete = vi.fn();
    render(<Timer inspection={false} useMs={false} onComplete={onComplete} readyHoldMs={550} />);

    fireEvent.keyDown(window, { code: "Space" }); // holding, not yet ready
    fireEvent.keyUp(window, { code: "Space" }); // released too early
    expect(onComplete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/components/Timer.test.tsx`
Expected: FAIL — "Cannot find module './Timer'".

- [ ] **Step 3: Implement `src/components/Timer.tsx`**

```tsx
// src/components/Timer.tsx
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "inspect" | "hold" | "ready" | "running";

type Props = {
  inspection: boolean;
  useMs: boolean;
  onComplete: (seconds: number) => void;
  readyHoldMs?: number;
};

function format(seconds: number, useMs: boolean): string {
  return seconds.toFixed(useMs ? 3 : 2);
}

export default function Timer({
  inspection,
  useMs,
  onComplete,
  readyHoldMs = 550,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [display, setDisplay] = useState(0);
  const [inspectLeft, setInspectLeft] = useState(15);
  const startRef = useRef(0);
  const readyTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");

  // Keep a ref of the current phase so the window listeners read fresh state.
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const clearReady = () => {
      if (readyTimer.current !== null) {
        clearTimeout(readyTimer.current);
        readyTimer.current = null;
      }
    };

    const tick = () => {
      setDisplay((performance.now() - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };

    const beginHold = () => {
      setPhase("hold");
      if (readyHoldMs <= 0) {
        setPhase("ready");
      } else {
        readyTimer.current = window.setTimeout(() => setPhase("ready"), readyHoldMs);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") {
        if (phaseRef.current === "running") stopRun();
        return;
      }
      e.preventDefault();
      const p = phaseRef.current;
      if (p === "running") {
        stopRun();
      } else if (p === "idle") {
        if (inspection) {
          setPhase("inspect");
          setInspectLeft(15);
        } else {
          beginHold();
        }
      } else if (p === "inspect") {
        beginHold();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      const p = phaseRef.current;
      if (p === "ready") {
        startRef.current = performance.now();
        setDisplay(0);
        setPhase("running");
        rafRef.current = requestAnimationFrame(tick);
      } else if (p === "hold") {
        clearReady();
        setPhase(inspection ? "inspect" : "idle"); // false start
      }
    };

    const stopRun = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const seconds = (performance.now() - startRef.current) / 1000;
      setDisplay(seconds);
      setPhase("idle");
      onComplete(seconds);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clearReady();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [inspection, readyHoldMs, onComplete]);

  // Inspection countdown.
  useEffect(() => {
    if (phase !== "inspect") return;
    const id = window.setInterval(() => {
      setInspectLeft((n) => Math.max(0, n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const color =
    phase === "ready" ? "text-green-600" : phase === "running" ? "text-slate-900" : "text-slate-500";

  return (
    <div className="text-center select-none">
      {phase === "inspect" ? (
        <div data-testid="inspection" className="text-2xl text-amber-600">
          Inspection: {inspectLeft}s
        </div>
      ) : null}
      <div data-testid="timer-display" className={`text-6xl font-mono tabular-nums ${color}`}>
        {format(display, useMs)}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Hold <kbd className="rounded border px-1">Space</kbd>, release to start, any key to stop.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/components/Timer.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Timer.tsx src/components/Timer.test.tsx
git commit -m "feat(timer): WCA spacebar timer with optional inspection"
```

---

### Task 6: `components/CubeDiagram.tsx` — bottom-face cross glyph

**Files:**
- Create: `src/components/CubeDiagram.tsx`

A minimal 3×3 bottom-face glyph: center + 4 edges painted the target cross color, corners neutral. White-only is used now; the `color` prop is kept for the color-neutral follow-up. No test file — it is a pure presentational component with no logic; it is exercised by the `TrainerCross` test.

- [ ] **Step 1: Implement `src/components/CubeDiagram.tsx`**

```tsx
// src/components/CubeDiagram.tsx
type Props = {
  color?: string; // CSS color for the cross stickers
  label?: string;
};

const CROSS_CELLS = new Set([1, 3, 4, 5, 7]); // center + 4 edges of a 3x3

export default function CubeDiagram({ color = "#f8fafc", label = "white" }: Props) {
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className="grid grid-cols-3 gap-0.5 rounded bg-slate-800 p-1"
        role="img"
        aria-label={`Target: ${label} cross`}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-sm border border-slate-700"
            style={{ backgroundColor: CROSS_CELLS.has(i) ? color : "#334155" }}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500">{label} cross</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CubeDiagram.tsx
git commit -m "feat(diagram): minimal bottom-face cross glyph"
```

---

### Task 7: `pages/TrainerCross.tsx` — the Cross trainer (TDD)

**Files:**
- Create: `src/pages/TrainerCross.tsx`
- Test: `src/pages/TrainerCross.test.tsx`

Controls: a `2..8` difficulty selector (default 4). On mount / difficulty change / "next scramble", it calls `generateCrossScramble(difficulty)` and shows the scramble + a white `CubeDiagram`. The `Timer`'s `onComplete` pushes a time, recomputes Ao5/Ao12, and reveals the "Show optimal solution" button. "Show optimal solution" renders `solveCross(scramble)`. "End session" appends a `DrillRecord` (`caseId: "cross"`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/TrainerCross.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileProvider } from "../state/ProfileProvider";
import TrainerCross from "./TrainerCross";

// Keep tests fast and deterministic: stub scramble + cross helpers.
vi.mock("../lib/scramble", () => ({
  generateCrossScramble: () => "R U2 F' D",
}));
vi.mock("../lib/cross", () => ({
  solveCross: () => "D' F R'",
  optimalCrossLength: () => 4,
}));

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => vi.restoreAllMocks());

function renderTrainer() {
  return render(
    <ProfileProvider>
      <TrainerCross />
    </ProfileProvider>,
  );
}

describe("TrainerCross", () => {
  it("renders a scramble", () => {
    renderTrainer();
    expect(screen.getByTestId("scramble")).toHaveTextContent("R U2 F' D");
  });

  it("hides the optimal solution button before any solve", () => {
    renderTrainer();
    expect(
      screen.queryByRole("button", { name: /show optimal solution/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("solution")).not.toBeInTheDocument();
  });

  it("changing difficulty regenerates a scramble", () => {
    renderTrainer();
    fireEvent.click(screen.getByRole("button", { name: "6" }));
    expect(screen.getByTestId("scramble")).toHaveTextContent("R U2 F' D");
  });
});
```

The timer's start/stop state machine is covered by `Timer.test.tsx`; the page test
stays on what is stable — a scramble renders and the solution stays hidden until a
solve. The mock returns a fixed scramble, so the assertions check control wiring,
not scramble contents.

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/pages/TrainerCross.test.tsx`
Expected: FAIL — "Cannot find module './TrainerCross'".

- [ ] **Step 3: Implement `src/pages/TrainerCross.tsx`**

```tsx
// src/pages/TrainerCross.tsx
import { useCallback, useEffect, useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import { generateCrossScramble } from "../lib/scramble";
import { solveCross } from "../lib/cross";
import Timer from "../components/Timer";
import CubeDiagram from "../components/CubeDiagram";

const DIFFICULTIES = [2, 3, 4, 5, 6, 7, 8];

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function avgOfLast(xs: number[], n: number): string {
  if (xs.length < n) return "—";
  return mean(xs.slice(-n)).toFixed(2);
}

export default function TrainerCross() {
  const { profile, addDrill } = useProfile();
  const [difficulty, setDifficulty] = useState(4);
  const [scramble, setScramble] = useState("");
  const [times, setTimes] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);

  const newScramble = useCallback((len: number) => {
    setScramble(generateCrossScramble(len));
    setSolved(false);
    setSolution(null);
  }, []);

  useEffect(() => {
    newScramble(difficulty);
  }, [difficulty, newScramble]);

  const handleComplete = useCallback((seconds: number) => {
    setTimes((t) => [...t, seconds]);
    setSolved(true);
  }, []);

  const endSession = () => {
    if (times.length === 0) return;
    addDrill({
      date: new Date().toISOString().slice(0, 10),
      caseId: "cross",
      attempts: times.length,
      avgTime: Number(mean(times).toFixed(3)),
    });
    setTimes([]);
    setSolved(false);
    setSolution(null);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-1">Cross trainer</h1>
      <p className="text-slate-600 mb-6">
        Solve only the white cross on a real cube. Pick a difficulty (optimal cross
        length), then time yourself.
      </p>

      <div className="mb-6 flex items-center gap-2">
        <span className="font-medium">Difficulty:</span>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDifficulty(d)}
            className={`h-9 w-9 rounded border ${
              d === difficulty
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between gap-6">
        <div>
          <div className="text-sm text-slate-500 mb-1">Scramble</div>
          <div data-testid="scramble" className="font-mono text-xl">
            {scramble}
          </div>
        </div>
        <CubeDiagram />
      </div>

      <div className="mb-6">
        <Timer
          inspection={profile.settings.inspection}
          useMs={profile.settings.useMs}
          onComplete={handleComplete}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => newScramble(difficulty)}
          className="rounded bg-slate-900 px-4 py-2 text-white"
        >
          Next scramble
        </button>
        {solved ? (
          solution === null ? (
            <button
              type="button"
              onClick={() => setSolution(solveCross(scramble))}
              className="rounded border border-slate-300 px-4 py-2"
            >
              Show optimal solution
            </button>
          ) : (
            <span data-testid="solution" className="font-mono text-slate-700">
              {solution}
            </span>
          )
        ) : null}
        <button
          type="button"
          onClick={endSession}
          className="ml-auto rounded border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50"
        >
          End session
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-200 pt-4">
        <Stat label="Solves" value={String(times.length)} />
        <Stat label="Ao5" value={avgOfLast(times, 5)} />
        <Stat label="Ao12" value={avgOfLast(times, 12)} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/pages/TrainerCross.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/TrainerCross.tsx src/pages/TrainerCross.test.tsx
git commit -m "feat(trainer): cross trainer page with timer, Ao5/Ao12, solution reveal"
```

---

### Task 8: Wire the Trainer route + full verification

**Files:**
- Modify: `src/pages/Trainer.tsx`

- [ ] **Step 1: Replace `src/pages/Trainer.tsx` to render the Cross trainer**

```tsx
// src/pages/Trainer.tsx
import TrainerCross from "./TrainerCross";

export default function Trainer() {
  return <TrainerCross />;
}
```

(`App.tsx` already routes `/trainer/*` to `Trainer`; no router change is needed for this slice.)

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all suites pass — the original 17 tests plus the new `cube` (7), `cross` (9), `scramble` (4), `profile` drill (2), `Timer` (2), and `TrainerCross` (3).

- [ ] **Step 3: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: no type errors; `dist/` builds successfully.

- [ ] **Step 4: Manual smoke test (headless Chrome screenshot)**

```bash
npm run dev > /tmp/cubeassist-dev.log 2>&1 &
sleep 4
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/cubeassist-dev.log | head -1 | cut -d: -f2)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --user-data-dir=/tmp/cubeassist-cr-trainer \
  --window-size=1280,1500 --virtual-time-budget=4000 \
  --screenshot=/tmp/cubeassist-shots/trainer.png "http://localhost:$PORT/trainer"
pkill -f vite
```

Open `/tmp/cubeassist-shots/trainer.png` and confirm: heading "Cross trainer", a difficulty row (2–8), a scramble in monospace, the white cross glyph, the timer at `0.00`, and "Next scramble" / "End session" buttons. The "Show optimal solution" button should NOT be visible until a solve is recorded.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Trainer.tsx
git commit -m "feat(trainer): wire Cross trainer into the /trainer route"
```

---

## Definition of done

- `npm test` green (17 original + 27 new).
- `npm run typecheck` clean; `npm run build` produces `dist/`.
- `/trainer` renders the Cross trainer: difficulty selector changes the scramble, the spacebar timer records solves, Ao5/Ao12 update, "Show optimal solution" appears only after a solve and prints a valid cross solution, "End session" records a `DrillRecord` (verify via `localStorage` key `cubeassist:profile:v1` → `drillHistory`).

## Hand-off to the next slice (color-neutral + other modes)

- Add a color selector to `TrainerCross`; generalize `cross.ts` to per-color BFS tables (rotate the scramble so the chosen color is on D, or build a table per solved-cross color); pass `color` into `CubeDiagram`.
- Promote `/trainer` to a landing page with three mode cards and move the Cross trainer to `/trainer/cross` (parent spec routing).
- Build the full 54-facelet `cube.ts` for the F2L trainer; enrich `f2l.json`.
```
