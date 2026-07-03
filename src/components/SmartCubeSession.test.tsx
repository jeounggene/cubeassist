import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProfileProvider } from "../state/ProfileProvider";
import { SimulatorCube } from "../lib/smartcube/simulator";
import type { CubeMove, Face } from "../lib/smartcube/smartcube";
import SmartCubeSession from "./SmartCubeSession";

// Build a quarter-turn CubeMove stream from an alg. A real smart cube emits only
// quarter turns, so "R2" becomes two R events.
function movesFrom(alg: string, t0: number): CubeMove[] {
  const quarters: { face: Face; dir: 1 | -1 }[] = [];
  for (const tok of alg.trim().split(/\s+/).filter(Boolean)) {
    const face = tok[0] as Face;
    if (tok.endsWith("2")) quarters.push({ face, dir: 1 }, { face, dir: 1 });
    else quarters.push({ face, dir: tok.endsWith("'") ? -1 : 1 });
  }
  return quarters.map((q, i) => ({ ...q, t: t0 + (i + 1) * 100 }));
}

// Exact inverse of a scramble string (reverse order; doubles unchanged).
function invert(alg: string): string {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map((t) => (t.endsWith("2") ? t : t.endsWith("'") ? t[0] : `${t}'`))
    .join(" ");
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

    const scramble = screen.getByTestId("scramble").textContent!.trim();
    expect(screen.getByTestId("live-total").textContent).toBe("—"); // nothing yet

    act(() => cube.feed(movesFrom(scramble, 0))); // apply scramble → ready
    act(() => cube.feed(movesFrom(invert(scramble), 100_000))); // solve it

    // A total split time is now shown (solve captured).
    expect(screen.getByTestId("live-total").textContent).not.toBe("—");
  });

  it("recovers from a wrong scramble move and still reaches a solve", async () => {
    const cube = new SimulatorCube();
    await cube.connect();
    render(
      <ProfileProvider>
        <SmartCubeSession cube={cube} />
      </ProfileProvider>,
    );
    const scramble = screen.getByTestId("scramble").textContent!.trim();
    const quarters = scramble.split(/\s+/).flatMap((t) => (t.endsWith("2") ? [t[0], t[0]] : [t]));

    // A wrong move flags off-scramble; undoing it gets back on track.
    act(() => cube.feed(movesFrom("L", 0)));
    expect(screen.getByTestId("scramble-status").textContent).toMatch(/off-scramble/i);
    act(() => cube.feed(movesFrom("L'", 1_000)));

    // Now apply the whole scramble → queue empties → ready.
    act(() => cube.feed(movesFrom(quarters.join(" "), 2_000)));

    const inverse = quarters
      .slice()
      .reverse()
      .map((t) => (t.endsWith("'") ? t[0] : `${t}'`))
      .join(" ");
    act(() => cube.feed(movesFrom(inverse, 100_000))); // solve it
    expect(screen.getByTestId("live-total").textContent).not.toBe("—");
  });
});
