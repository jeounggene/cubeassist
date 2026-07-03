import { describe, it, expect } from "vitest";
import type { GanCubeEvent } from "gan-web-bluetooth";
import { ganEventToCubeMove, normalizeMac } from "./gan";

describe("normalizeMac", () => {
  it("accepts a colon-separated MAC and upper-cases it", () => {
    expect(normalizeMac("ab:12:cd:34:ef:56")).toBe("AB:12:CD:34:EF:56");
  });

  it("accepts a dash-separated MAC and normalises the separators", () => {
    expect(normalizeMac(" AB-12-CD-34-EF-56 ")).toBe("AB:12:CD:34:EF:56");
  });

  it("rejects malformed input", () => {
    expect(normalizeMac("")).toBeNull();
    expect(normalizeMac("not a mac")).toBeNull();
    expect(normalizeMac("AB:12:CD:34:EF")).toBeNull(); // too short
    expect(normalizeMac("AB:12:CD:34:EF:5G")).toBeNull(); // non-hex
  });
});

// Build a GanCubeEvent-shaped object for testing (real events carry more fields).
const ev = (over: Record<string, unknown>): GanCubeEvent =>
  ({ timestamp: 0, serial: 1, ...over }) as unknown as GanCubeEvent;

describe("ganEventToCubeMove", () => {
  it("maps a clockwise move using the cube timestamp", () => {
    expect(
      ganEventToCubeMove(ev({ type: "MOVE", move: "R", cubeTimestamp: 1234, localTimestamp: 5 })),
    ).toEqual({ face: "R", dir: 1, t: 1234 });
  });

  it("maps a prime move and falls back to localTimestamp", () => {
    expect(
      ganEventToCubeMove(ev({ type: "MOVE", move: "U'", cubeTimestamp: null, localTimestamp: 99 })),
    ).toEqual({ face: "U", dir: -1, t: 99 });
  });

  it("ignores non-move events", () => {
    expect(ganEventToCubeMove(ev({ type: "FACELETS", facelets: "..." }))).toBeNull();
    expect(ganEventToCubeMove(ev({ type: "DISCONNECT" }))).toBeNull();
  });

  it("ignores a move with an unrecognised face", () => {
    expect(
      ganEventToCubeMove(ev({ type: "MOVE", move: "", cubeTimestamp: 1, localTimestamp: 1 })),
    ).toBeNull();
    expect(
      ganEventToCubeMove(ev({ type: "MOVE", move: "x", cubeTimestamp: 1, localTimestamp: 1 })),
    ).toBeNull();
  });
});
