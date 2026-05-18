# CubeAssist — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the CubeAssist app and ship a working Profile page that captures the user's stage times and algorithm-known checklists into `localStorage`. This is the foundation that subsequent plans (Library, Trainer, Recommendations) build on.

**Architecture:** Vite + React + TypeScript single-page app. Tailwind for styling. `react-router-dom` v6 for routing. All persistence lives in `localStorage` behind a typed `lib/profile.ts` API. Pure functions where possible so unit testing with Vitest is straightforward. The Profile page is the only "real" page in this plan — Dashboard/Trainer/Library/Notation get placeholder routes that later plans will replace.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, react-router-dom 6, Vitest, @testing-library/react, jsdom

**Reference spec:** `docs/superpowers/specs/2026-05-14-cubeassist-design.md`

---

## File map (created by this plan)

```
cubeassist/
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  tailwind.config.js
  postcss.config.js
  index.html
  .gitignore
  src/
    main.tsx
    App.tsx
    index.css
    types/
      profile.ts
    lib/
      profile.ts
      profile.test.ts
    data/
      cases/
        f2l.json
        oll2look.json
        pll2look.json
        oll.json
        pll.json
    state/
      ProfileProvider.tsx
    components/
      Nav.tsx
    pages/
      Profile.tsx
      Profile.test.tsx
      Dashboard.tsx          (placeholder)
      Trainer.tsx            (placeholder)
      Library.tsx            (placeholder)
      Notation.tsx           (placeholder)
      NotFound.tsx
  test/
    setup.ts
```

Each file has one responsibility. `lib/profile.ts` is the only module that touches `localStorage`. Pages consume profile state through the `useProfile` hook, never `localStorage` directly.

---

### Task 1: Scaffold Vite + React + TypeScript

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`

- [ ] **Step 1: Initialize the project**

Run from the parent directory (or use the existing `cubeassist/` directory — the prompts below assume you're already inside it):

```bash
cd /Users/genej/projects/cubeassist
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty," select **"Ignore files and continue"** (the `docs/` directory is already there).

- [ ] **Step 2: Install base dependencies**

```bash
npm install
npm install react-router-dom@^6
```

- [ ] **Step 3: Replace `src/App.tsx` with a minimal placeholder**

```tsx
// src/App.tsx
export default function App() {
  return <div className="p-8 text-2xl">CubeAssist — scaffolding</div>;
}
```

- [ ] **Step 4: Replace `src/index.css` with an empty file** (Tailwind directives come in Task 2)

```css
/* src/index.css */
```

- [ ] **Step 5: Verify the dev server runs**

```bash
npm run dev
```

Expected: server starts on `http://localhost:5173` and shows "CubeAssist — scaffolding". Stop the server with Ctrl+C.

- [ ] **Step 6: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite + React + TS project"
```

---

### Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/index.css`, `src/App.tsx`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss@^3 postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Configure Tailwind content paths**

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 3: Add Tailwind directives to `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Verify Tailwind classes render**

The existing `src/App.tsx` already uses `p-8 text-2xl`. Run `npm run dev` and confirm the text has padding and is large. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind CSS"
```

---

### Task 3: Add Vitest + Testing Library

**Files:**
- Create: `test/setup.ts`
- Modify: `vite.config.ts`, `package.json`, `tsconfig.json`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest@^3 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
```

- [ ] **Step 2: Create the test setup file**

```ts
// test/setup.ts
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 25 ships an experimental `globalThis.localStorage` (and an experimental
// localStorage hook inside jsdom's window) that is an inert methodless stub
// when no --localstorage-file flag is given. Provide an in-memory shim with
// the full Web Storage API and bind it as the global before each test.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    css: false,
  },
});
```

- [ ] **Step 4: Add `vitest/globals` to `tsconfig.json` types**

Inside the `compilerOptions` object of `tsconfig.json`, add (or extend) the `types` array:

```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

- [ ] **Step 5: Add a `test` script to `package.json`**

In the `scripts` section, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Write and run a smoke test**

Create `src/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("vitest runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:

```bash
npm test
```

Expected: 1 test passes. Delete `src/smoke.test.ts` after confirming.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add Vitest + Testing Library"
```

---

### Task 4: Define the `UserProfile` types

**Files:**
- Create: `src/types/profile.ts`

- [ ] **Step 1: Write the type definitions**

```ts
// src/types/profile.ts

export type Stage = "cross" | "f2l" | "oll" | "pll";
export type ChecklistKey = "f2l" | "oll2look" | "pll2look" | "oll" | "pll";

export type StageTime = {
  avg: number | null;
  samples: number[]; // last 12 entries, FIFO; seconds
};

export type DrillRecord = {
  date: string;    // ISO "YYYY-MM-DD"
  caseId: string;  // e.g., "PLL-T"
  attempts: number;
  avgTime: number;
};

export type Settings = {
  inspection: boolean;
  useMs: boolean;
};

export type UserProfile = {
  schemaVersion: 1;
  times: Record<Stage, StageTime>;
  known: Record<ChecklistKey, Record<string, boolean>>;
  drillHistory: DrillRecord[];
  settings: Settings;
};

export const SAMPLE_WINDOW = 12;
export const STORAGE_KEY = "cubeassist:profile:v1";
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/profile.ts
git commit -m "feat(types): define UserProfile schema"
```

---

### Task 5: Implement `profile.ts` — load and save (TDD)

**Files:**
- Create: `src/lib/profile.ts`, `src/lib/profile.test.ts`

- [ ] **Step 1: Write the failing test for `loadProfile` and `saveProfile`**

```ts
// src/lib/profile.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadProfile, saveProfile, emptyProfile } from "./profile";
import { STORAGE_KEY, UserProfile } from "../types/profile";

beforeEach(() => {
  localStorage.clear();
});

describe("loadProfile / saveProfile", () => {
  it("returns an empty profile when localStorage is empty", () => {
    const p = loadProfile();
    expect(p.schemaVersion).toBe(1);
    expect(p.times.cross.avg).toBeNull();
    expect(p.times.cross.samples).toEqual([]);
    expect(p.known.pll).toEqual({});
    expect(p.drillHistory).toEqual([]);
    expect(p.settings.inspection).toBe(true);
  });

  it("round-trips a saved profile", () => {
    const p = emptyProfile();
    p.times.pll.avg = 3.2;
    p.times.pll.samples = [3.0, 3.4];
    p.known.pll = { "PLL-T": true };
    saveProfile(p);

    const reloaded = loadProfile();
    expect(reloaded.times.pll.avg).toBe(3.2);
    expect(reloaded.times.pll.samples).toEqual([3.0, 3.4]);
    expect(reloaded.known.pll["PLL-T"]).toBe(true);
  });

  it("recovers from corrupt JSON by returning an empty profile", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    const p = loadProfile();
    expect(p.schemaVersion).toBe(1);
    expect(p.times.cross.samples).toEqual([]);
  });

  it("recovers from a missing schemaVersion by returning an empty profile", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    const p = loadProfile();
    expect(p.schemaVersion).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/lib/profile.test.ts
```

Expected: FAIL — "Cannot find module './profile'".

- [ ] **Step 3: Implement `profile.ts` (minimal — just `emptyProfile`, `loadProfile`, `saveProfile`)**

```ts
// src/lib/profile.ts
import {
  UserProfile,
  Stage,
  ChecklistKey,
  STORAGE_KEY,
} from "../types/profile";

const STAGES: Stage[] = ["cross", "f2l", "oll", "pll"];
const CHECKLISTS: ChecklistKey[] = ["f2l", "oll2look", "pll2look", "oll", "pll"];

export function emptyProfile(): UserProfile {
  return {
    schemaVersion: 1,
    times: Object.fromEntries(
      STAGES.map((s) => [s, { avg: null, samples: [] }]),
    ) as UserProfile["times"],
    known: Object.fromEntries(CHECKLISTS.map((k) => [k, {}])) as UserProfile["known"],
    drillHistory: [],
    settings: { inspection: true, useMs: false },
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
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx vitest run src/lib/profile.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile.ts src/lib/profile.test.ts
git commit -m "feat(profile): load/save round-trip with localStorage"
```

---

### Task 6: Implement `appendTimeSample` with rolling average (TDD)

**Files:**
- Modify: `src/lib/profile.ts`, `src/lib/profile.test.ts`

- [ ] **Step 1: Add failing tests for `appendTimeSample`**

Append to `src/lib/profile.test.ts`:

```ts
import { appendTimeSample } from "./profile";

describe("appendTimeSample", () => {
  it("appends a sample and recomputes avg", () => {
    let p = emptyProfile();
    p = appendTimeSample(p, "pll", 3.0);
    p = appendTimeSample(p, "pll", 4.0);
    expect(p.times.pll.samples).toEqual([3.0, 4.0]);
    expect(p.times.pll.avg).toBeCloseTo(3.5);
  });

  it("keeps only the last 12 samples (FIFO)", () => {
    let p = emptyProfile();
    for (let i = 1; i <= 15; i++) {
      p = appendTimeSample(p, "cross", i);
    }
    expect(p.times.cross.samples).toHaveLength(12);
    expect(p.times.cross.samples[0]).toBe(4);   // dropped 1, 2, 3
    expect(p.times.cross.samples[11]).toBe(15);
    // avg of 4..15 = (4+15)*12/2 / 12 = 9.5
    expect(p.times.cross.avg).toBeCloseTo(9.5);
  });

  it("rejects non-positive samples", () => {
    const p = emptyProfile();
    expect(() => appendTimeSample(p, "pll", 0)).toThrow();
    expect(() => appendTimeSample(p, "pll", -1)).toThrow();
  });

  it("does not mutate the input profile", () => {
    const p = emptyProfile();
    const out = appendTimeSample(p, "pll", 3.0);
    expect(p.times.pll.samples).toEqual([]);
    expect(out).not.toBe(p);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run src/lib/profile.test.ts
```

Expected: FAIL — "appendTimeSample is not a function".

- [ ] **Step 3: Implement `appendTimeSample`**

First, extend the existing import at the top of `src/lib/profile.ts` so it also pulls in `SAMPLE_WINDOW`. The import goes from:

```ts
import {
  UserProfile,
  Stage,
  ChecklistKey,
  STORAGE_KEY,
} from "../types/profile";
```

to:

```ts
import {
  UserProfile,
  Stage,
  ChecklistKey,
  STORAGE_KEY,
  SAMPLE_WINDOW,
} from "../types/profile";
```

Then append the new function at the end of `src/lib/profile.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx vitest run src/lib/profile.test.ts
```

Expected: all tests pass (4 previous + 4 new = 8).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile.ts src/lib/profile.test.ts
git commit -m "feat(profile): appendTimeSample with rolling Ao12 average"
```

---

### Task 7: Implement `setKnown` helper (TDD)

**Files:**
- Modify: `src/lib/profile.ts`, `src/lib/profile.test.ts`

- [ ] **Step 1: Add failing tests for `setKnown`**

Append to `src/lib/profile.test.ts`:

```ts
import { setKnown } from "./profile";

describe("setKnown", () => {
  it("marks an algorithm as known", () => {
    const p = setKnown(emptyProfile(), "pll", "PLL-T", true);
    expect(p.known.pll["PLL-T"]).toBe(true);
  });

  it("clears a previously-known algorithm when value is false", () => {
    let p = setKnown(emptyProfile(), "oll", "OLL-27", true);
    p = setKnown(p, "oll", "OLL-27", false);
    expect(p.known.oll["OLL-27"]).toBe(false);
  });

  it("does not mutate the input profile", () => {
    const p = emptyProfile();
    const out = setKnown(p, "pll", "PLL-T", true);
    expect(p.known.pll["PLL-T"]).toBeUndefined();
    expect(out).not.toBe(p);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run src/lib/profile.test.ts
```

Expected: FAIL — "setKnown is not a function".

- [ ] **Step 3: Implement `setKnown`**

Append to `src/lib/profile.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx vitest run src/lib/profile.test.ts
```

Expected: 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile.ts src/lib/profile.test.ts
git commit -m "feat(profile): setKnown helper for checklist updates"
```

---

### Task 8: Seed content stub JSON files

Each stub contains only what the Profile page needs to render its checklists: `{ id, name }` per case. Later plans will expand entries with algorithms, diagrams, recognition cues, etc.

**Files:**
- Create: `src/data/cases/f2l.json`, `src/data/cases/oll2look.json`, `src/data/cases/pll2look.json`, `src/data/cases/oll.json`, `src/data/cases/pll.json`

- [ ] **Step 1: Create `src/data/cases/pll2look.json`** (6 entries — the smallest set, gets us going)

```json
[
  { "id": "2pll-edges-Ua", "name": "2-look PLL — Ua perm (edges)" },
  { "id": "2pll-edges-Ub", "name": "2-look PLL — Ub perm (edges)" },
  { "id": "2pll-edges-Z",  "name": "2-look PLL — Z perm (edges)" },
  { "id": "2pll-edges-H",  "name": "2-look PLL — H perm (edges)" },
  { "id": "2pll-corners-Aa", "name": "2-look PLL — A perm (corners)" },
  { "id": "2pll-corners-E",  "name": "2-look PLL — E perm (corners)" }
]
```

- [ ] **Step 2: Create `src/data/cases/oll2look.json`** (10 entries: 3 edge-orientation + 7 corner-orientation)

```json
[
  { "id": "2oll-eo-dot",  "name": "2-look OLL — EO dot (no edges oriented)" },
  { "id": "2oll-eo-line", "name": "2-look OLL — EO line (2 edges oriented)" },
  { "id": "2oll-eo-L",    "name": "2-look OLL — EO L-shape (2 edges oriented)" },
  { "id": "2oll-oc-sune",      "name": "2-look OLL — Sune (OCLL)" },
  { "id": "2oll-oc-antisune",  "name": "2-look OLL — Anti-Sune (OCLL)" },
  { "id": "2oll-oc-h",         "name": "2-look OLL — H (OCLL)" },
  { "id": "2oll-oc-pi",        "name": "2-look OLL — Pi (OCLL)" },
  { "id": "2oll-oc-l",         "name": "2-look OLL — L-shape (OCLL)" },
  { "id": "2oll-oc-t",         "name": "2-look OLL — T-shape (OCLL)" },
  { "id": "2oll-oc-u",         "name": "2-look OLL — U-shape (OCLL)" }
]
```

- [ ] **Step 3: Create `src/data/cases/pll.json`** (21 entries — all 21 PLL cases)

```json
[
  { "id": "PLL-Aa", "name": "PLL Aa perm" },
  { "id": "PLL-Ab", "name": "PLL Ab perm" },
  { "id": "PLL-E",  "name": "PLL E perm" },
  { "id": "PLL-F",  "name": "PLL F perm" },
  { "id": "PLL-Ga", "name": "PLL Ga perm" },
  { "id": "PLL-Gb", "name": "PLL Gb perm" },
  { "id": "PLL-Gc", "name": "PLL Gc perm" },
  { "id": "PLL-Gd", "name": "PLL Gd perm" },
  { "id": "PLL-H",  "name": "PLL H perm" },
  { "id": "PLL-Ja", "name": "PLL Ja perm" },
  { "id": "PLL-Jb", "name": "PLL Jb perm" },
  { "id": "PLL-Na", "name": "PLL Na perm" },
  { "id": "PLL-Nb", "name": "PLL Nb perm" },
  { "id": "PLL-Ra", "name": "PLL Ra perm" },
  { "id": "PLL-Rb", "name": "PLL Rb perm" },
  { "id": "PLL-T",  "name": "PLL T perm" },
  { "id": "PLL-Ua", "name": "PLL Ua perm" },
  { "id": "PLL-Ub", "name": "PLL Ub perm" },
  { "id": "PLL-V",  "name": "PLL V perm" },
  { "id": "PLL-Y",  "name": "PLL Y perm" },
  { "id": "PLL-Z",  "name": "PLL Z perm" }
]
```

- [ ] **Step 4: Create `src/data/cases/oll.json`** (all 57 OLL cases, IDs `OLL-01` through `OLL-57`)

```json
[
  { "id": "OLL-01", "name": "OLL 01" },
  { "id": "OLL-02", "name": "OLL 02" },
  { "id": "OLL-03", "name": "OLL 03" },
  { "id": "OLL-04", "name": "OLL 04" },
  { "id": "OLL-05", "name": "OLL 05" },
  { "id": "OLL-06", "name": "OLL 06" },
  { "id": "OLL-07", "name": "OLL 07" },
  { "id": "OLL-08", "name": "OLL 08" },
  { "id": "OLL-09", "name": "OLL 09" },
  { "id": "OLL-10", "name": "OLL 10" },
  { "id": "OLL-11", "name": "OLL 11" },
  { "id": "OLL-12", "name": "OLL 12" },
  { "id": "OLL-13", "name": "OLL 13" },
  { "id": "OLL-14", "name": "OLL 14" },
  { "id": "OLL-15", "name": "OLL 15" },
  { "id": "OLL-16", "name": "OLL 16" },
  { "id": "OLL-17", "name": "OLL 17" },
  { "id": "OLL-18", "name": "OLL 18" },
  { "id": "OLL-19", "name": "OLL 19" },
  { "id": "OLL-20", "name": "OLL 20" },
  { "id": "OLL-21", "name": "OLL 21" },
  { "id": "OLL-22", "name": "OLL 22" },
  { "id": "OLL-23", "name": "OLL 23" },
  { "id": "OLL-24", "name": "OLL 24" },
  { "id": "OLL-25", "name": "OLL 25" },
  { "id": "OLL-26", "name": "OLL 26" },
  { "id": "OLL-27", "name": "OLL 27 — Sune" },
  { "id": "OLL-28", "name": "OLL 28" },
  { "id": "OLL-29", "name": "OLL 29" },
  { "id": "OLL-30", "name": "OLL 30" },
  { "id": "OLL-31", "name": "OLL 31" },
  { "id": "OLL-32", "name": "OLL 32" },
  { "id": "OLL-33", "name": "OLL 33" },
  { "id": "OLL-34", "name": "OLL 34" },
  { "id": "OLL-35", "name": "OLL 35" },
  { "id": "OLL-36", "name": "OLL 36" },
  { "id": "OLL-37", "name": "OLL 37" },
  { "id": "OLL-38", "name": "OLL 38" },
  { "id": "OLL-39", "name": "OLL 39" },
  { "id": "OLL-40", "name": "OLL 40" },
  { "id": "OLL-41", "name": "OLL 41" },
  { "id": "OLL-42", "name": "OLL 42" },
  { "id": "OLL-43", "name": "OLL 43" },
  { "id": "OLL-44", "name": "OLL 44" },
  { "id": "OLL-45", "name": "OLL 45" },
  { "id": "OLL-46", "name": "OLL 46" },
  { "id": "OLL-47", "name": "OLL 47" },
  { "id": "OLL-48", "name": "OLL 48" },
  { "id": "OLL-49", "name": "OLL 49" },
  { "id": "OLL-50", "name": "OLL 50" },
  { "id": "OLL-51", "name": "OLL 51" },
  { "id": "OLL-52", "name": "OLL 52" },
  { "id": "OLL-53", "name": "OLL 53" },
  { "id": "OLL-54", "name": "OLL 54" },
  { "id": "OLL-55", "name": "OLL 55" },
  { "id": "OLL-56", "name": "OLL 56" },
  { "id": "OLL-57", "name": "OLL 57" }
]
```

(OLL-21 is "OLL 21" for now; later plans annotate with case names like "Cross", "Bowtie", etc.)

- [ ] **Step 5: Create `src/data/cases/f2l.json`** (41 entries, IDs `f2l-01` through `f2l-41`)

```json
[
  { "id": "f2l-01", "name": "F2L 01" },
  { "id": "f2l-02", "name": "F2L 02" },
  { "id": "f2l-03", "name": "F2L 03" },
  { "id": "f2l-04", "name": "F2L 04" },
  { "id": "f2l-05", "name": "F2L 05" },
  { "id": "f2l-06", "name": "F2L 06" },
  { "id": "f2l-07", "name": "F2L 07" },
  { "id": "f2l-08", "name": "F2L 08" },
  { "id": "f2l-09", "name": "F2L 09" },
  { "id": "f2l-10", "name": "F2L 10" },
  { "id": "f2l-11", "name": "F2L 11" },
  { "id": "f2l-12", "name": "F2L 12" },
  { "id": "f2l-13", "name": "F2L 13" },
  { "id": "f2l-14", "name": "F2L 14" },
  { "id": "f2l-15", "name": "F2L 15" },
  { "id": "f2l-16", "name": "F2L 16" },
  { "id": "f2l-17", "name": "F2L 17" },
  { "id": "f2l-18", "name": "F2L 18" },
  { "id": "f2l-19", "name": "F2L 19" },
  { "id": "f2l-20", "name": "F2L 20" },
  { "id": "f2l-21", "name": "F2L 21" },
  { "id": "f2l-22", "name": "F2L 22" },
  { "id": "f2l-23", "name": "F2L 23" },
  { "id": "f2l-24", "name": "F2L 24" },
  { "id": "f2l-25", "name": "F2L 25" },
  { "id": "f2l-26", "name": "F2L 26" },
  { "id": "f2l-27", "name": "F2L 27" },
  { "id": "f2l-28", "name": "F2L 28" },
  { "id": "f2l-29", "name": "F2L 29" },
  { "id": "f2l-30", "name": "F2L 30" },
  { "id": "f2l-31", "name": "F2L 31" },
  { "id": "f2l-32", "name": "F2L 32" },
  { "id": "f2l-33", "name": "F2L 33" },
  { "id": "f2l-34", "name": "F2L 34" },
  { "id": "f2l-35", "name": "F2L 35" },
  { "id": "f2l-36", "name": "F2L 36" },
  { "id": "f2l-37", "name": "F2L 37" },
  { "id": "f2l-38", "name": "F2L 38" },
  { "id": "f2l-39", "name": "F2L 39" },
  { "id": "f2l-40", "name": "F2L 40" },
  { "id": "f2l-41", "name": "F2L 41" }
]
```

- [ ] **Step 6: Enable JSON imports in TypeScript**

Add (or extend) `compilerOptions` in `tsconfig.json`:

```json
"resolveJsonModule": true,
"esModuleInterop": true
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/data tsconfig.json
git commit -m "feat(data): seed checklist stubs for f2l/oll/pll/2-look"
```

---

### Task 9: Build `ProfileProvider` context and `useProfile` hook

**Files:**
- Create: `src/state/ProfileProvider.tsx`

- [ ] **Step 1: Implement the provider**

```tsx
// src/state/ProfileProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { UserProfile } from "../types/profile";
import {
  appendTimeSample,
  emptyProfile,
  loadProfile,
  saveProfile,
  setKnown,
} from "../lib/profile";

type ProfileContextValue = {
  profile: UserProfile;
  addTime: (stage: keyof UserProfile["times"], seconds: number) => void;
  toggleKnown: (
    list: keyof UserProfile["known"],
    caseId: string,
    value: boolean,
  ) => void;
  setSetting: <K extends keyof UserProfile["settings"]>(
    key: K,
    value: UserProfile["settings"][K],
  ) => void;
  resetProfile: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      addTime: (stage, seconds) =>
        setProfile((p) => appendTimeSample(p, stage, seconds)),
      toggleKnown: (list, caseId, value) =>
        setProfile((p) => setKnown(p, list, caseId, value)),
      setSetting: (key, value) =>
        setProfile((p) => ({ ...p, settings: { ...p.settings, [key]: value } })),
      resetProfile: () => setProfile(emptyProfile()),
    }),
    [profile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/state
git commit -m "feat(state): ProfileProvider with localStorage sync"
```

---

### Task 10: Build the Profile page — Times section (TDD)

**Files:**
- Create: `src/pages/Profile.tsx`, `src/pages/Profile.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/Profile.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileProvider } from "../state/ProfileProvider";
import Profile from "./Profile";

function renderProfile() {
  return render(
    <ProfileProvider>
      <Profile />
    </ProfileProvider>,
  );
}

describe("Profile page — times", () => {
  it("renders an input for each stage", () => {
    renderProfile();
    expect(screen.getByLabelText(/cross time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/f2l time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/oll time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pll time/i)).toBeInTheDocument();
  });

  it("records a time and displays the new average", async () => {
    const user = userEvent.setup();
    renderProfile();
    const input = screen.getByLabelText(/pll time/i) as HTMLInputElement;
    await user.type(input, "3.0");
    await user.click(screen.getByRole("button", { name: /add pll time/i }));

    await user.clear(input);
    await user.type(input, "4.0");
    await user.click(screen.getByRole("button", { name: /add pll time/i }));

    expect(screen.getByTestId("pll-avg")).toHaveTextContent("3.50");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/pages/Profile.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Profile.tsx` (Times section only — checklists come in Task 11)**

```tsx
// src/pages/Profile.tsx
import { useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import type { Stage } from "../types/profile";

const STAGES: { key: Stage; label: string }[] = [
  { key: "cross", label: "Cross" },
  { key: "f2l", label: "F2L" },
  { key: "oll", label: "OLL" },
  { key: "pll", label: "PLL" },
];

function StageTimeInput({ stage, label }: { stage: Stage; label: string }) {
  const { profile, addTime } = useProfile();
  const [value, setValue] = useState("");

  const submit = () => {
    const n = Number(value);
    if (n > 0 && Number.isFinite(n)) {
      addTime(stage, n);
      setValue("");
    }
  };

  const avg = profile.times[stage].avg;
  return (
    <div className="flex items-center gap-3 py-2">
      <label
        htmlFor={`${stage}-time`}
        className="w-20 font-medium"
      >
        {label}
      </label>
      <input
        id={`${stage}-time`}
        aria-label={`${label} time`}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-24 rounded border border-slate-300 px-2 py-1"
      />
      <button
        type="button"
        onClick={submit}
        aria-label={`Add ${label} time`}
        className="rounded bg-slate-900 px-3 py-1 text-white"
      >
        Add
      </button>
      <span className="text-sm text-slate-600">
        avg:{" "}
        <span data-testid={`${stage}-avg`}>
          {avg === null ? "—" : avg.toFixed(2)}
        </span>
        s ({profile.times[stage].samples.length} samples)
      </span>
    </div>
  );
}

export default function Profile() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Your profile</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Stage times</h2>
        <p className="text-sm text-slate-600 mb-3">
          Enter your most recent times for each CFOP stage. We keep a rolling
          average of your last 12 entries.
        </p>
        {STAGES.map((s) => (
          <StageTimeInput key={s.key} stage={s.key} label={s.label} />
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/pages/Profile.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile.tsx src/pages/Profile.test.tsx
git commit -m "feat(profile-page): stage time inputs with rolling average"
```

---

### Task 11: Add the Checklists section to the Profile page (TDD)

**Files:**
- Modify: `src/pages/Profile.tsx`, `src/pages/Profile.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `src/pages/Profile.test.tsx`:

```tsx
describe("Profile page — checklists", () => {
  it("renders sections for each algorithm list", () => {
    renderProfile();
    expect(screen.getByRole("heading", { name: /^f2l$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2-look oll/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2-look pll/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^oll$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^pll$/i })).toBeInTheDocument();
  });

  it("renders a checkbox for every PLL case (21 total)", () => {
    renderProfile();
    const region = screen.getByRole("region", { name: /^pll$/i });
    const checkboxes = region.querySelectorAll("input[type='checkbox']");
    expect(checkboxes).toHaveLength(21);
  });

  it("toggling a checkbox updates the profile", async () => {
    const user = userEvent.setup();
    renderProfile();
    const box = screen.getByRole("checkbox", { name: /pll t perm/i });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run src/pages/Profile.test.tsx
```

Expected: FAIL — checklist sections not found.

- [ ] **Step 3: Add a `Checklist` component and wire all five lists into `Profile.tsx`**

Replace `src/pages/Profile.tsx` with:

```tsx
import { useState } from "react";
import { useProfile } from "../state/ProfileProvider";
import type { ChecklistKey, Stage } from "../types/profile";

import f2lCases from "../data/cases/f2l.json";
import oll2lookCases from "../data/cases/oll2look.json";
import pll2lookCases from "../data/cases/pll2look.json";
import ollCases from "../data/cases/oll.json";
import pllCases from "../data/cases/pll.json";

type Case = { id: string; name: string };

const STAGES: { key: Stage; label: string }[] = [
  { key: "cross", label: "Cross" },
  { key: "f2l", label: "F2L" },
  { key: "oll", label: "OLL" },
  { key: "pll", label: "PLL" },
];

const CHECKLISTS: { key: ChecklistKey; label: string; cases: Case[] }[] = [
  { key: "f2l", label: "F2L", cases: f2lCases as Case[] },
  { key: "oll2look", label: "2-look OLL", cases: oll2lookCases as Case[] },
  { key: "pll2look", label: "2-look PLL", cases: pll2lookCases as Case[] },
  { key: "oll", label: "OLL", cases: ollCases as Case[] },
  { key: "pll", label: "PLL", cases: pllCases as Case[] },
];

function StageTimeInput({ stage, label }: { stage: Stage; label: string }) {
  const { profile, addTime } = useProfile();
  const [value, setValue] = useState("");

  const submit = () => {
    const n = Number(value);
    if (n > 0 && Number.isFinite(n)) {
      addTime(stage, n);
      setValue("");
    }
  };

  const avg = profile.times[stage].avg;
  return (
    <div className="flex items-center gap-3 py-2">
      <label htmlFor={`${stage}-time`} className="w-20 font-medium">
        {label}
      </label>
      <input
        id={`${stage}-time`}
        aria-label={`${label} time`}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-24 rounded border border-slate-300 px-2 py-1"
      />
      <button
        type="button"
        onClick={submit}
        aria-label={`Add ${label} time`}
        className="rounded bg-slate-900 px-3 py-1 text-white"
      >
        Add
      </button>
      <span className="text-sm text-slate-600">
        avg:{" "}
        <span data-testid={`${stage}-avg`}>
          {avg === null ? "—" : avg.toFixed(2)}
        </span>
        s ({profile.times[stage].samples.length} samples)
      </span>
    </div>
  );
}

function Checklist({
  list,
  label,
  cases,
}: {
  list: ChecklistKey;
  label: string;
  cases: Case[];
}) {
  const { profile, toggleKnown } = useProfile();
  const total = cases.length;
  const knownCount = cases.filter((c) => profile.known[list][c.id]).length;

  return (
    <section
      aria-labelledby={`heading-${list}`}
      role="region"
      aria-label={label}
      className="mb-6"
    >
      <div className="flex items-baseline justify-between mb-2">
        <h2 id={`heading-${list}`} className="text-xl font-semibold">
          {label}
        </h2>
        <span className="text-sm text-slate-600">
          {knownCount} / {total} known
        </span>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-1">
        {cases.map((c) => {
          const checked = !!profile.known[list][c.id];
          return (
            <li key={c.id}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleKnown(list, c.id, e.target.checked)}
                  aria-label={c.name}
                />
                <span>{c.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Profile() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Your profile</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Stage times</h2>
        <p className="text-sm text-slate-600 mb-3">
          Enter your most recent times for each CFOP stage. We keep a rolling
          average of your last 12 entries.
        </p>
        {STAGES.map((s) => (
          <StageTimeInput key={s.key} stage={s.key} label={s.label} />
        ))}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Algorithms known</h2>
        <p className="text-sm text-slate-600 mb-3">
          Check the ones you've memorized. Used by the recommendation engine.
        </p>
        {CHECKLISTS.map((cl) => (
          <Checklist
            key={cl.key}
            list={cl.key}
            label={cl.label}
            cases={cl.cases}
          />
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx vitest run src/pages/Profile.test.tsx
```

Expected: 5 tests pass (2 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile.tsx src/pages/Profile.test.tsx
git commit -m "feat(profile-page): algorithm checklists for all five lists"
```

---

### Task 12: Add Settings section to Profile page (TDD)

**Files:**
- Modify: `src/pages/Profile.tsx`, `src/pages/Profile.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `src/pages/Profile.test.tsx`:

```tsx
describe("Profile page — settings", () => {
  it("toggles inspection time setting", async () => {
    const user = userEvent.setup();
    renderProfile();
    const cb = screen.getByRole("checkbox", { name: /enable 15s inspection/i });
    expect(cb).toBeChecked(); // default on
    await user.click(cb);
    expect(cb).not.toBeChecked();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/pages/Profile.test.tsx
```

Expected: FAIL — inspection checkbox not found.

- [ ] **Step 3: Add the Settings section to `Profile.tsx`**

Inside `Profile.tsx`'s default export, append a third `<section>` after the algorithms section:

```tsx
        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <SettingsSection />
        </section>
```

And add a new component above the `Profile` function:

```tsx
function SettingsSection() {
  const { profile, setSetting, resetProfile } = useProfile();
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={profile.settings.inspection}
          onChange={(e) => setSetting("inspection", e.target.checked)}
          aria-label="Enable 15s inspection"
        />
        <span>Enable 15s inspection (WCA-style)</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={profile.settings.useMs}
          onChange={(e) => setSetting("useMs", e.target.checked)}
          aria-label="Show milliseconds"
        />
        <span>Show milliseconds in timer</span>
      </label>
      <button
        type="button"
        onClick={() => {
          if (confirm("Reset all profile data? This cannot be undone.")) {
            resetProfile();
          }
        }}
        className="rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50"
      >
        Reset all data
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/pages/Profile.test.tsx
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Profile.tsx src/pages/Profile.test.tsx
git commit -m "feat(profile-page): settings section with inspection + reset"
```

---

### Task 13: Add Nav and placeholder pages for future routes

**Files:**
- Create: `src/components/Nav.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Trainer.tsx`, `src/pages/Library.tsx`, `src/pages/Notation.tsx`, `src/pages/NotFound.tsx`

- [ ] **Step 1: Create the Nav component**

```tsx
// src/components/Nav.tsx
import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/profile", label: "Profile" },
  { to: "/library", label: "Library" },
  { to: "/trainer", label: "Trainer" },
  { to: "/notation", label: "Notation" },
];

export default function Nav() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-4">
        <span className="font-bold text-lg">CubeAssist</span>
        <ul className="flex gap-4">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "text-slate-900 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create placeholder pages**

```tsx
// src/pages/Dashboard.tsx
export default function Dashboard() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-slate-600">
        Recommendations appear here once you've entered your times on the
        Profile page. (Coming in Plan 4.)
      </p>
    </main>
  );
}
```

```tsx
// src/pages/Trainer.tsx
export default function Trainer() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Trainer</h1>
      <p className="text-slate-600">Coming in Plan 3.</p>
    </main>
  );
}
```

```tsx
// src/pages/Library.tsx
export default function Library() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Library</h1>
      <p className="text-slate-600">Coming in Plan 2.</p>
    </main>
  );
}
```

```tsx
// src/pages/Notation.tsx
export default function Notation() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Notation primer</h1>
      <p className="text-slate-600">Coming in Plan 2.</p>
    </main>
  );
}
```

```tsx
// src/pages/NotFound.tsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Not found</h1>
      <Link to="/" className="text-blue-600 underline">
        Back to dashboard
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components src/pages/Dashboard.tsx src/pages/Trainer.tsx src/pages/Library.tsx src/pages/Notation.tsx src/pages/NotFound.tsx
git commit -m "feat(pages): nav + placeholder pages for future plans"
```

---

### Task 14: Wire everything into the App root

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileProvider } from "./state/ProfileProvider";
import Nav from "./components/Nav";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Trainer from "./pages/Trainer";
import Library from "./pages/Library";
import Notation from "./pages/Notation";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/trainer/*" element={<Trainer />} />
          <Route path="/library/*" element={<Library />} />
          <Route path="/notation" element={<Notation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  );
}
```

- [ ] **Step 2: Verify `src/main.tsx` mounts the app** (the default Vite scaffold already does — no change needed unless your `main.tsx` differs).

Expected contents:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

If different, replace with the above.

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: 17 tests pass (11 profile-lib + 6 profile-page).

- [ ] **Step 4: Manual smoke test in browser**

```bash
npm run dev
```

In the browser at `http://localhost:5173`:
1. Navigate to **Profile**.
2. Enter `3.0` in the PLL time field, click "Add". Confirm the avg shows `3.00 (1 samples)`.
3. Enter `5.0`, click "Add". Confirm avg shows `4.00 (2 samples)`.
4. Tick the **PLL T perm** checkbox under the PLL section. Confirm the "X / 21 known" counter updates.
5. Reload the page. Confirm the time and checkbox persist.
6. Click **Reset all data**, confirm the modal, then confirm the state clears.
7. Navigate between Dashboard / Library / Trainer / Notation. Confirm each placeholder renders without error.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat(app): wire router + ProfileProvider into App root"
```

---

### Task 15: Add a typecheck script and verify the build

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add a `typecheck` script**

In `package.json` `scripts`:

```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run a production build**

```bash
npm run build
```

Expected: build completes without errors. Output appears in `dist/`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add typecheck script"
```

---

## Definition of done for Plan 1

- All 17 tests pass (`npm test`).
- `npm run typecheck` is clean.
- `npm run build` produces a `dist/` bundle.
- In the running app: the user can enter stage times, tick algorithm checkboxes, toggle settings, reset their data, and have all of that persist across reloads in `localStorage`.
- Placeholder routes for Dashboard / Trainer / Library / Notation render without error.

## Hand-off to Plan 2 (Library + cube diagrams)

Plan 2 will:
- Add a `CubeDiagram` component built on `sr-visualizer` (or equivalent).
- Expand the `data/cases/*.json` files from `{ id, name }` stubs to include `{ algorithm, alternates, recognition, fingertricks, breakdown[] }` per case.
- Replace the `Library` placeholder with the grid + detail/tutorial pages described in §Library of the spec.
- Replace the `Notation` placeholder with the notation primer.
