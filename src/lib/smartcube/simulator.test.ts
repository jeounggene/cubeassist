import { describe, it, expect, vi } from "vitest";
import { moveToken } from "./smartcube";
import type { CubeMove } from "./smartcube";
import { SimulatorCube } from "./simulator";

const mv = (face: CubeMove["face"], dir: 1 | -1, t: number): CubeMove => ({ face, dir, t });

describe("moveToken", () => {
  it("maps clockwise to a bare face and CCW to prime", () => {
    expect(moveToken(mv("R", 1, 0))).toBe("R");
    expect(moveToken(mv("U", -1, 0))).toBe("U'");
  });
});

describe("SimulatorCube", () => {
  it("connects, emits moves to subscribers, and unsubscribes", async () => {
    const cube = new SimulatorCube();
    await cube.connect();
    expect(cube.connected).toBe(true);

    const seen: string[] = [];
    const unsub = cube.onMove((m) => seen.push(moveToken(m)));
    cube.feed([mv("R", 1, 100), mv("U", -1, 200)]);
    expect(seen).toEqual(["R", "U'"]);

    unsub();
    cube.emit(mv("F", 1, 300));
    expect(seen).toEqual(["R", "U'"]); // no longer receiving

    const onDisc = vi.fn();
    cube.onDisconnect(onDisc);
    await cube.disconnect();
    expect(cube.connected).toBe(false);
    expect(onDisc).toHaveBeenCalledOnce();
  });
});
