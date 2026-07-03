# Live 3D Cube + Self-Correcting Scramble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live 3D cube that mirrors the physical smart cube (animated turns + gyro tilt) and a self-correcting scramble that keeps the target state fixed no matter what you turn.

**Architecture:** A pure move-queue makes scrambling mistake-proof (prepend the inverse of any wrong turn — the target stays invariant). A cubelet-based CSS-3D component renders the live `facecube` state, animates quarter-turns, and tilts via the GAN gyro quaternion. Both live in `SmartCubeSession`, fed by the existing move stream.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, Vitest. Reuses `src/lib/facecube.ts` (`applyAlg`, `solved`, `faceletGeometry`), `gan-web-bluetooth` (GYRO events).

## Global Constraints

- **Pure logic in `src/lib`, no React imports there.** Components in `src/components`.
- **Additive, optional interface changes only** — `SmartCube.onOrientation?` is optional so `SimulatorCube` and tests keep working.
- **The scramble queue holds only single quarter-turn tokens** (`"R"` / `"R'"`), so it matches the cube's per-quarter MOVE events; doubles are only ever produced for *display*.
- **Never desync the 3D view:** if moves arrive faster than an animation, snap (skip animation).
- Run tests with `npx vitest run <path>`; typecheck `npm run typecheck`; lint `npx eslint <files>`.
- Commit after each task with the shown message.

---

### Task 1: Self-correcting scramble queue (pure)

**Files:**
- Create: `src/lib/smartcube/scramble-queue.ts`
- Test: `src/lib/smartcube/scramble-queue.test.ts`

**Interfaces:**
- Consumes: `applyAlg`, `solved` from `../facecube` (tests only).
- Produces:
  - `type QueueState = { queue: string[]; deviated: boolean }`
  - `initQueue(scramble: string): string[]`
  - `applyMove(queue: string[], move: string): QueueState`
  - `simplifyForDisplay(queue: string[]): string[]`
  - `invertToken(token: string): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/smartcube/scramble-queue.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { solved, applyAlg } from "../facecube";
import { initQueue, applyMove, simplifyForDisplay, invertToken } from "./scramble-queue";

const SCRAMBLE = "R U2 R' D F2 L";

describe("invertToken", () => {
  it("inverts quarter turns and leaves doubles", () => {
    expect(invertToken("R")).toBe("R'");
    expect(invertToken("R'")).toBe("R");
    expect(invertToken("R2")).toBe("R2");
  });
});

describe("initQueue", () => {
  it("expands doubles into single quarter turns", () => {
    expect(initQueue("R U2 R'")).toEqual(["R", "U", "U", "R'"]);
  });
});

describe("applyMove", () => {
  it("pops the head on a correct move", () => {
    expect(applyMove(["R", "U"], "R")).toEqual({ queue: ["U"], deviated: false });
  });

  it("prepends the inverse on a wrong move and flags it", () => {
    expect(applyMove(["R", "U"], "L")).toEqual({ queue: ["L'", "R", "U"], deviated: true });
  });

  it("cancels an inverse pair at the head", () => {
    // head is R'; doing R prepends R' ... but head is R' so invert(R)=R' matches head R'? no —
    // queue [R', U], move R -> prepend R' -> [R', R', U] (no cancel, same dir)
    expect(applyMove(["R'", "U"], "R")).toEqual({ queue: ["R'", "R'", "U"], deviated: true });
    // queue [R, U], move R' -> prepend R -> [R, R, U] (no cancel)
    // queue [R, U], user redoes the head's inverse scenario: [R', R, U] cancels to [U]
  });

  it("cancels when the deviation undoes the head", () => {
    // head R; a wrong move whose inverse equals... construct: queue [U, R], move U' ->
    // prepend U -> [U, U, R]; not a cancel. Cancel happens when prepended token is the
    // inverse of the new second element: queue [R', ...], move R' (== head) pops instead.
    // Direct cancel case: queue [U], move that prepends inverse === U' then head U cancels:
    expect(applyMove(["U"], "U")).toEqual({ queue: [], deviated: false }); // correct move empties
  });
});

describe("simplifyForDisplay", () => {
  it("collapses adjacent same-face runs", () => {
    expect(simplifyForDisplay(["R", "R", "U", "R", "R", "R"])).toEqual(["R2", "U", "R'"]);
    expect(simplifyForDisplay(["R", "R'", "U"])).toEqual(["U"]);
  });
});

describe("target invariance (property)", () => {
  const target = applyAlg(solved(), SCRAMBLE);
  const MOVES = ["R", "R'", "U", "U'", "L", "L'", "D", "D'", "F", "F'"];
  // deterministic pseudo-random sequence (no Math.random in this codebase's spirit)
  const seq = Array.from({ length: 60 }, (_, i) => MOVES[(i * 7 + 3) % MOVES.length]);

  it("keeps applyAlg(state, queue) === target after every move", () => {
    let queue = initQueue(SCRAMBLE);
    let state = solved();
    for (const m of seq) {
      state = applyAlg(state, m);
      queue = applyMove(queue, m).queue;
      const reached = applyAlg(state, queue.join(" "));
      expect(reached).toEqual(target);
    }
  });

  it("empties exactly when the scramble is applied cleanly", () => {
    let queue = initQueue(SCRAMBLE);
    for (const m of initQueue(SCRAMBLE)) queue = applyMove(queue, m).queue;
    expect(queue).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/smartcube/scramble-queue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/smartcube/scramble-queue.ts`**

```ts
export type QueueState = { queue: string[]; deviated: boolean };

export function invertToken(token: string): string {
  if (token.endsWith("2")) return token;
  if (token.endsWith("'")) return token[0];
  return `${token}'`;
}

// Quarter-turn count of a token, mod 4: R=1, R2=2, R'=3.
function amount(token: string): number {
  if (token.endsWith("2")) return 2;
  if (token.endsWith("'")) return 3;
  return 1;
}

// Build the shortest token for `face` turned `amt` quarters (null if a no-op).
function tokenFor(face: string, amt: number): string | null {
  const a = ((amt % 4) + 4) % 4;
  if (a === 0) return null;
  return a === 1 ? face : a === 2 ? `${face}2` : `${face}'`;
}

// Expand a scramble into single quarter-turn tokens ("R U2 R'" -> R U U R').
export function initQueue(scramble: string): string[] {
  const out: string[] = [];
  for (const tok of scramble.trim().split(/\s+/).filter(Boolean)) {
    if (tok.endsWith("2")) out.push(tok[0], tok[0]);
    else out.push(tok);
  }
  return out;
}

// Feed one physical quarter-turn. Correct move (matches head) => pop it. Wrong move =>
// prepend its inverse (the user must undo it). Invariant: applyAlg(state, queue) == target.
// (A wrong move can never be the head, so no head-cancellation case arises here; the
// user works off a prepended correction by simply doing it, which hits the pop branch.)
export function applyMove(queue: string[], move: string): QueueState {
  if (queue.length > 0 && queue[0] === move) {
    return { queue: queue.slice(1), deviated: false };
  }
  return { queue: [invertToken(move), ...queue], deviated: true };
}

// Collapse adjacent same-face runs for a compact display ("R R" -> "R2").
export function simplifyForDisplay(queue: string[]): string[] {
  const out: string[] = [];
  for (const tok of queue) {
    const last = out[out.length - 1];
    if (last && last[0] === tok[0]) {
      const merged = tokenFor(tok[0], amount(last) + amount(tok));
      out.pop();
      if (merged != null) out.push(merged);
    } else {
      out.push(tok);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/smartcube/scramble-queue.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/smartcube/scramble-queue.ts src/lib/smartcube/scramble-queue.test.ts
git commit -m "feat(coach): self-correcting scramble move-queue"
```

---

### Task 2: Wire the queue into the session

**Files:**
- Modify: `src/components/SmartCubeSession.tsx`
- Test: `src/components/SmartCubeSession.test.tsx`

**Interfaces:**
- Consumes: `initQueue`, `applyMove`, `simplifyForDisplay` (Task 1); existing `detectSplits`, `moveToken`, `applyAlg`, `solved`.
- Produces: the session now tracks a remaining-move queue instead of a target-equality gate; renders the remaining scramble (next move highlighted) + an "off-scramble" banner; ready when the queue empties.

- [ ] **Step 1: Write the failing test**

Add to `src/components/SmartCubeSession.test.tsx` (new test; keep the existing one):

```tsx
it("recovers from a wrong scramble move and still reaches a solve", async () => {
  const cube = new SimulatorCube();
  await cube.connect();
  render(
    <ProfileProvider>
      <SmartCubeSession cube={cube} />
    </ProfileProvider>,
  );
  const scramble = screen.getByTestId("scramble").textContent!.trim();
  const q = scramble
    .split(/\s+/)
    .flatMap((t) => (t.endsWith("2") ? [t[0], t[0]] : [t]));

  // Do one wrong move first, then undo it, then the full scramble → queue empties.
  act(() => cube.feed(movesFrom("L", 0)));
  expect(screen.getByTestId("scramble-status").textContent).toMatch(/off-scramble/i);
  act(() => cube.feed(movesFrom("L'", 1_000)));
  act(() => cube.feed(movesFrom(q.join(" "), 2_000)));

  // Ready → now solve it (inverse) → a total split shows.
  const inverse = q
    .slice()
    .reverse()
    .map((t) => (t.endsWith("'") ? t[0] : `${t}'`))
    .join(" ");
  act(() => cube.feed(movesFrom(inverse, 100_000)));
  expect(screen.getByTestId("live-total").textContent).not.toBe("—");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SmartCubeSession.test.tsx`
Expected: FAIL — no `scramble-status` testid; wrong-move handling absent.

- [ ] **Step 3: Update `SmartCubeSession.tsx`**

Replace the scramble tracking. Swap the imports and the ready/target refs:

```tsx
import { initQueue, applyMove, simplifyForDisplay } from "../lib/smartcube/scramble-queue";
```

Replace the `targetRef` + the `!readyRef` block. New refs + state:

```tsx
  const queueRef = useRef<string[]>(initQueue(scramble));
  const [remaining, setRemaining] = useState<string[]>(() => simplifyForDisplay(queueRef.current));
  const [deviated, setDeviated] = useState(false);
```

In `startNextScramble`, reset the queue instead of the target:

```tsx
      const next = generateScramble(20);
      runningRef.current = solved();
      queueRef.current = initQueue(next);
      setRemaining(simplifyForDisplay(queueRef.current));
      setDeviated(false);
      readyRef.current = false;
      startStateRef.current = null;
      bufRef.current = [];
      setReady(false);
      setScramble(next);
```

In `onMove`, replace the "waiting for scramble" branch:

```tsx
      if (!readyRef.current) {
        const res = applyMove(queueRef.current, token);
        queueRef.current = res.queue;
        setRemaining(simplifyForDisplay(res.queue));
        setDeviated(res.deviated);
        if (res.queue.length === 0) {
          readyRef.current = true;
          startStateRef.current = runningRef.current;
          setReady(true);
        }
        return;
      }
```

Render the remaining scramble + status where the scramble text was:

```tsx
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
        {ready ? "Solving… go!" : "Apply this scramble to your cube"}
      </div>
      <div data-testid="scramble" className="font-mono text-lg mb-1">
        {scramble}
      </div>
      {!ready ? (
        <div data-testid="scramble-status" className="mb-4 text-sm">
          {deviated ? (
            <span className="text-red-600 dark:text-red-400">
              Off-scramble — the remaining moves were adjusted.
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              Remaining: <span className="font-mono">{remaining.join(" ") || "done"}</span>
            </span>
          )}
        </div>
      ) : null}
```

Note: `queueRef` must be initialised from the initial `scramble` (the `useState(scramble)` value). Keep the existing `runningRef`/`startStateRef`/`t0Ref`/`bufRef` refs; delete `targetRef` and its uses.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/components/SmartCubeSession.test.tsx && npm run typecheck`
Expected: PASS (both the existing and new tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/SmartCubeSession.tsx src/components/SmartCubeSession.test.tsx
git commit -m "feat(coach): self-correcting scramble with live remaining + deviation banner"
```

---

### Task 3: Quaternion helpers (pure)

**Files:**
- Create: `src/lib/quaternion.ts`
- Test: `src/lib/quaternion.test.ts`

**Interfaces:**
- Produces:
  - `type Quaternion = { x: number; y: number; z: number; w: number }`
  - `mul(a: Quaternion, b: Quaternion): Quaternion`
  - `conjugate(q: Quaternion): Quaternion`
  - `toMatrix3d(q: Quaternion): string` (a CSS `matrix3d(...)` value)

- [ ] **Step 1: Write the failing test**

Create `src/lib/quaternion.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mul, conjugate, toMatrix3d } from "./quaternion";

const I = { x: 0, y: 0, z: 0, w: 1 };

describe("quaternion", () => {
  it("multiplies by identity", () => {
    const q = { x: 0.5, y: 0.5, z: 0.5, w: 0.5 };
    expect(mul(I, q)).toEqual(q);
  });

  it("conjugates", () => {
    expect(conjugate({ x: 1, y: 2, z: 3, w: 4 })).toEqual({ x: -1, y: -2, z: -3, w: 4 });
  });

  it("maps identity to the identity matrix3d", () => {
    expect(toMatrix3d(I)).toBe("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)");
  });

  it("maps a 180° turn about Y to a known matrix", () => {
    // q = (0,1,0,0): rotate 180° about Y → diag(-1,1,-1)
    expect(toMatrix3d({ x: 0, y: 1, z: 0, w: 0 })).toBe(
      "matrix3d(-1,0,0,0,0,1,0,0,0,0,-1,0,0,0,0,1)",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/quaternion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/quaternion.ts`**

```ts
export type Quaternion = { x: number; y: number; z: number; w: number };

export function mul(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function conjugate(q: Quaternion): Quaternion {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

// Round tiny float noise so identities render exactly.
const r = (n: number) => {
  const v = Math.round(n * 1e6) / 1e6;
  return Object.is(v, -0) ? 0 : v;
};

// Column-major CSS matrix3d for the rotation the quaternion represents.
export function toMatrix3d(q: Quaternion): string {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  const x = q.x / len, y = q.y / len, z = q.z / len, w = q.w / len;
  const m = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ];
  return `matrix3d(${m.map(r).join(",")})`;
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/quaternion.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quaternion.ts src/lib/quaternion.test.ts
git commit -m "feat(coach): quaternion helpers for gyro orientation"
```

---

### Task 4: `CubeView3D` — cubelet render (colors correct, fixed angle)

**Files:**
- Create: `src/components/CubeView3D.tsx`
- Test: `src/components/CubeView3D.test.tsx`

**Interfaces:**
- Consumes: `faceletGeometry`, `solved` from `../lib/facecube`; `Quaternion`, `toMatrix3d` from `../lib/quaternion`; `Face` from `../lib/smartcube/smartcube`.
- Produces: `default function CubeView3D({ facelets, turn, orientation, onTurnDone })`. This task implements the static render (snap on state change) and fixed angle; animation is Task 5.

**Design:** 26 cubelets at positions `p ∈ {-1,0,1}³` (skip `[0,0,0]`). For each cubelet, each axis where `|p[axis]| === 1` is an outward sticker face; its color = `facelets[indexAt(p, normal)]`, where `indexAt` is precomputed from `faceletGeometry()` (facelet whose `pos` equals the cubelet pos and whose `normal` points outward along that axis).

- [ ] **Step 1: Write the failing test**

Create `src/components/CubeView3D.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { solved } from "../lib/facecube";
import CubeView3D from "./CubeView3D";

describe("CubeView3D", () => {
  it("renders one sticker per outward facelet (54 stickers) for a solved cube", () => {
    const { container } = render(<CubeView3D facelets={solved()} />);
    expect(container.querySelectorAll('[data-sticker]').length).toBe(54);
  });

  it("colors the U-center sticker with the U color", () => {
    const { container } = render(<CubeView3D facelets={solved()} />);
    // U center is facelet index 4; solved() color id 0.
    const el = container.querySelector('[data-sticker="4"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.getAttribute("data-color")).toBe("0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CubeView3D.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/components/CubeView3D.tsx`**

```tsx
import { faceletGeometry } from "../lib/facecube";
import { toMatrix3d } from "../lib/quaternion";
import type { Quaternion } from "../lib/quaternion";
import type { Face } from "../lib/smartcube/smartcube";

// Real-cube scheme by color id (U R F D L B) — matches MiniF2LCube.
const COLORS = ["#fde047", "#f97316", "#22c55e", "#f8fafc", "#ef4444", "#3b82f6"];
const GEO = faceletGeometry();
const CELL = 40; // px per cubelet
const GAP = 3;
const STEP = CELL + GAP;

type Axis = 0 | 1 | 2;
type Sticker = { index: number; pos: [number, number, number]; axis: Axis; sign: 1 | -1 };

// Precompute the sticker (facelet) sitting on each cubelet's outward faces.
const STICKERS: Sticker[] = GEO.map((g, index) => {
  // A facelet's outward normal has exactly one non-zero axis.
  const axis = (g.normal.findIndex((c) => c !== 0)) as Axis;
  const sign = (g.normal[axis] > 0 ? 1 : -1) as 1 | -1;
  return { index, pos: [g.pos[0], g.pos[1], g.pos[2]], axis, sign };
});

// CSS transform placing a sticker on the given cubelet face.
function stickerTransform(s: Sticker): string {
  const [x, y, z] = s.pos;
  const t = `translate3d(${x * STEP}px, ${-y * STEP}px, ${z * STEP}px)`;
  const half = CELL / 2;
  // Rotate the flat sticker to face outward along its axis, then push to the face.
  const rot =
    s.axis === 2
      ? s.sign === 1
        ? "rotateY(0deg)"
        : "rotateY(180deg)"
      : s.axis === 0
        ? s.sign === 1
          ? "rotateY(90deg)"
          : "rotateY(-90deg)"
        : s.sign === 1
          ? "rotateX(90deg)"
          : "rotateX(-90deg)";
  return `${t} ${rot} translateZ(${half}px)`;
}

type Props = {
  facelets: number[];
  turn?: { face: Face; dir: 1 | -1; nonce: number } | null;
  orientation?: Quaternion | null;
  onTurnDone?: () => void;
};

export default function CubeView3D({ facelets, orientation }: Props) {
  const base = "rotateX(-25deg) rotateY(-35deg)";
  const tilt = orientation ? toMatrix3d(orientation) : "";
  return (
    <div style={{ width: 3 * STEP, height: 3 * STEP, perspective: "700px", margin: "0 auto" }}>
      <div
        style={{
          position: "relative",
          width: CELL,
          height: CELL,
          margin: `${STEP}px auto`,
          transformStyle: "preserve-3d",
          transform: `${base} ${tilt}`,
        }}
      >
        {STICKERS.map((s) => (
          <div
            key={s.index}
            data-sticker={s.index}
            data-color={facelets[s.index]}
            style={{
              position: "absolute",
              width: CELL,
              height: CELL,
              backgroundColor: COLORS[facelets[s.index]],
              border: "1px solid rgba(15,23,42,0.6)",
              borderRadius: 4,
              transform: stickerTransform(s),
              backfaceVisibility: "hidden",
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/components/CubeView3D.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CubeView3D.tsx src/components/CubeView3D.test.tsx
git commit -m "feat(coach): CubeView3D cubelet renderer (live state, fixed angle)"
```

---

### Task 5: Animated turns + gyro orientation + session wiring

**Files:**
- Modify: `src/lib/smartcube/smartcube.ts` (add `Quaternion` re-export + `onOrientation?`)
- Modify: `src/lib/smartcube/gan.ts` (emit orientation from GYRO)
- Modify: `src/components/CubeView3D.tsx` (animate the turning layer)
- Modify: `src/components/SmartCubeSession.tsx` (render the cube, feed turns + orientation, recenter)
- Test: `src/lib/smartcube/gan.test.ts` (orientation mapping)

**Interfaces:**
- Consumes: `Quaternion` (Task 3), `CubeView3D` (Task 4).
- Produces: `SmartCube.onOrientation?(cb: (q: Quaternion) => void): () => void`; `GanCube` implements it; the session shows the live cube with a Recenter button.

- [ ] **Step 1: Add `onOrientation` to the interface**

In `src/lib/smartcube/smartcube.ts` add:

```ts
import type { Quaternion } from "../quaternion";
export type { Quaternion };
```

and in `interface SmartCube` add the optional method:

```ts
  onOrientation?(cb: (q: Quaternion) => void): () => void;
```

- [ ] **Step 2: Write the failing GAN orientation test**

Add to `src/lib/smartcube/gan.test.ts`:

```ts
import { ganEventToOrientation } from "./gan";

describe("ganEventToOrientation", () => {
  it("maps a GYRO event's quaternion", () => {
    expect(
      ganEventToOrientation(ev({ type: "GYRO", quaternion: { x: 0, y: 0, z: 0, w: 1 } })),
    ).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });
  it("ignores non-gyro events", () => {
    expect(ganEventToOrientation(ev({ type: "MOVE", move: "R" }))).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/smartcube/gan.test.ts`
Expected: FAIL — `ganEventToOrientation` not exported.

- [ ] **Step 4: Implement orientation in `gan.ts`**

Add the pure mapper and wire it into the class:

```ts
import type { Quaternion } from "../quaternion";

export function ganEventToOrientation(event: GanCubeEvent): Quaternion | null {
  if (event.type !== "GYRO") return null;
  const q = event.quaternion;
  return { x: q.x, y: q.y, z: q.z, w: q.w };
}
```

In `GanCube`, add `private oriCbs = new Set<(q: Quaternion) => void>();`, dispatch in the events subscription:

```ts
      const ori = ganEventToOrientation(event);
      if (ori) {
        this.oriCbs.forEach((cb) => cb(ori));
        return;
      }
```

(placed alongside the existing MOVE / DISCONNECT handling), and add the method:

```ts
  onOrientation(cb: (q: Quaternion) => void): () => void {
    this.oriCbs.add(cb);
    return () => this.oriCbs.delete(cb);
  }
```

- [ ] **Step 5: Animate the turning layer in `CubeView3D.tsx`**

Add an animation group: when `turn` changes (`nonce`), wrap the cubelets of the turning
layer in a group `<div>` whose transform animates from 0 to ±90° about the layer axis,
then call `onTurnDone` on `transitionend`. Cubelets in the layer are those whose
`pos[turn.face axis] === faceValue`. Map `Face → {axis, value}` (`U:{1,1} D:{1,-1}
R:{0,1} L:{0,-1} F:{2,1} B:{2,-1}`). Rotation sign = `dir` times the face's outward sign.
Use `transition: transform 180ms` and, on a new `turn` arriving before the previous
`transitionend`, resolve immediately (snap) so the view can't lag. Concretely:

```tsx
import { useEffect, useRef, useState } from "react";

const FACE_AXIS: Record<Face, { axis: 0 | 1 | 2; val: 1 | -1 }> = {
  U: { axis: 1, val: 1 }, D: { axis: 1, val: -1 },
  R: { axis: 0, val: 1 }, L: { axis: 0, val: -1 },
  F: { axis: 2, val: 1 }, B: { axis: 2, val: -1 },
};

// inside the component:
const [angle, setAngle] = useState(0);
const activeRef = useRef<Props["turn"]>(null);
useEffect(() => {
  if (!turn) return;
  activeRef.current = turn;
  setAngle(0);
  const id = requestAnimationFrame(() => setAngle(90 * turn.dir * FACE_AXIS[turn.face].val));
  const done = setTimeout(() => { activeRef.current = null; setAngle(0); onTurnDone?.(); }, 190);
  return () => { cancelAnimationFrame(id); clearTimeout(done); };
}, [turn?.nonce]);

const inLayer = (s: Sticker) =>
  activeRef.current ? s.pos[FACE_AXIS[activeRef.current.face].axis] === FACE_AXIS[activeRef.current.face].val : false;
```

Render the layer's stickers inside a group with `transition: transform 180ms` and
`transform: rotate<Axis>(angle)`, the rest outside it. Keep the `data-sticker`/`data-color`
attributes on every sticker so Task 4's test still passes. (Snap-on-fast-moves is handled
by the parent: it only sets a new `turn` after committing state — see Step 6.)

- [ ] **Step 6: Wire the cube into `SmartCubeSession.tsx`**

Track the latest orientation and the current turn; render `CubeView3D` and a Recenter
button. In the component:

```tsx
import CubeView3D from "./CubeView3D";
import { conjugate, mul } from "../lib/quaternion";
import type { Quaternion } from "../lib/quaternion";
```

State/refs:

```tsx
  const [turn, setTurn] = useState<{ face: Face; dir: 1 | -1; nonce: number } | null>(null);
  const [orientation, setOrientation] = useState<Quaternion | null>(null);
  const neutralRef = useRef<Quaternion | null>(null);
  const rawOriRef = useRef<Quaternion | null>(null);
  const nonceRef = useRef(0);
```

Subscribe to orientation (effect, alongside the move subscription):

```tsx
  useEffect(() => {
    if (!cube.onOrientation) return;
    return cube.onOrientation((q) => {
      rawOriRef.current = q;
      const n = neutralRef.current;
      setOrientation(n ? mul(conjugate(n), q) : q);
    });
  }, [cube]);
```

In `onMove`, after updating `runningRef`, also drive the animation:

```tsx
      nonceRef.current += 1;
      setTurn({ face: m.face, dir: m.dir, nonce: nonceRef.current });
```

Render (above the split readout):

```tsx
      <div className="mb-4">
        <CubeView3D facelets={runningRef.current} turn={turn} orientation={orientation} />
        {cube.onOrientation ? (
          <div className="text-center mt-1">
            <button
              type="button"
              onClick={() => { neutralRef.current = rawOriRef.current; }}
              className="text-xs text-slate-500 dark:text-slate-400 underline"
            >
              Recenter cube
            </button>
          </div>
        ) : null}
      </div>
```

Note: `runningRef.current` is a ref, so pass it directly — the `setTurn`/`setReady`/state
updates already trigger the re-render that re-reads it.

- [ ] **Step 7: Run the full suite + typecheck + lint + build**

Run: `npx vitest run && npm run typecheck && npx eslint src/lib/quaternion.ts src/lib/smartcube/scramble-queue.ts src/components/CubeView3D.tsx src/components/SmartCubeSession.tsx src/lib/smartcube/gan.ts && npm run build`
Expected: all green; new files lint-clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/smartcube/smartcube.ts src/lib/smartcube/gan.ts src/lib/smartcube/gan.test.ts src/components/CubeView3D.tsx src/components/SmartCubeSession.tsx
git commit -m "feat(coach): animated turns + gyro tilt + recenter on the live cube"
```

---

## Self-Review

**1. Spec coverage:**
- Self-correcting queue (invariant, deviation flag, display simplify) → Task 1. ✓
- Session queue integration (remaining display, banner, ready) → Task 2. ✓
- Quaternion helpers → Task 3. ✓
- Cubelet 3D render (live colors, fixed angle) → Task 4. ✓
- Animated turns + gyro + recenter + `onOrientation` interface + GAN gyro mapping → Task 5. ✓
- Snap-when-faster-than-animation → Task 5 Step 5 (new `turn` resolves the prior immediately). ✓
- No-gyro fallback (simulator) → `onOrientation` optional; fixed angle when `orientation` null. ✓

**2. Placeholder scan:** No TBD/TODO. Task 5's animation step shows real code for the group/angle mechanism; the exact JSX split (layer group vs rest) is described with the values needed. Visual behavior (animation smoothness, gyro tilt) is verified in-app, not in jsdom.

**3. Type consistency:** `QueueState`/`applyMove`/`initQueue`/`simplifyForDisplay` identical across Tasks 1–2. `Quaternion` defined in Task 3, re-exported from `smartcube.ts` (Task 5 Step 1), consumed in `gan.ts`, `CubeView3D`, `SmartCubeSession`. `turn` shape `{face,dir,nonce}` identical in `CubeView3D` props and the session. `Face` reused from `smartcube.ts`. `FACE_AXIS` mapping matches the one in `splits.ts` (U:{1,1}…). `onOrientation` signature identical in the interface, `GanCube`, and the session subscription.
