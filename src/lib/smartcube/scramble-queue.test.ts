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

  it("undoing a prepended correction pops it (back on track)", () => {
    const after = applyMove(["R", "U"], "L"); // -> ["L'", "R", "U"], deviated
    expect(after.deviated).toBe(true);
    expect(applyMove(after.queue, "L'")).toEqual({ queue: ["R", "U"], deviated: false });
  });

  it("empties on the final correct move", () => {
    expect(applyMove(["U"], "U")).toEqual({ queue: [], deviated: false });
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
  // Deterministic pseudo-random sequence (no Math.random — keep tests reproducible).
  const seq = Array.from({ length: 60 }, (_, i) => MOVES[(i * 7 + 3) % MOVES.length]);

  it("keeps applyAlg(state, queue) === target after every move", () => {
    let queue = initQueue(SCRAMBLE);
    let state = solved();
    for (const m of seq) {
      state = applyAlg(state, m);
      queue = applyMove(queue, m).queue;
      expect(applyAlg(state, queue.join(" "))).toEqual(target);
    }
  });

  it("empties exactly when the scramble is applied cleanly", () => {
    let queue = initQueue(SCRAMBLE);
    for (const m of initQueue(SCRAMBLE)) queue = applyMove(queue, m).queue;
    expect(queue).toEqual([]);
  });
});
