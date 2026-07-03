import type { SmartCube, CubeMove, Face } from "./smartcube";
import type { GanCubeConnection, GanCubeEvent } from "gan-web-bluetooth";

const FACES = new Set<Face>(["U", "D", "L", "R", "F", "B"]);

// Map a GAN cube event to a CubeMove, or null if it isn't a usable face turn.
// GAN reports `move` in standard notation ("R", "U'"), so face + direction come
// straight from the string. Prefer the cube's hardware clock for split timing.
export function ganEventToCubeMove(event: GanCubeEvent): CubeMove | null {
  if (event.type !== "MOVE") return null;
  const face = event.move[0] as Face | undefined;
  if (!face || !FACES.has(face)) return null;
  const dir: 1 | -1 = event.move.endsWith("'") ? -1 : 1;
  const t = event.cubeTimestamp ?? event.localTimestamp ?? event.timestamp;
  return { face, dir, t };
}

// A real smart cube backed by a GAN (i3 / 356 i / 12) over Web Bluetooth.
// The library is dynamic-imported so it (and its deps) stay out of the main bundle.
export class GanCube implements SmartCube {
  readonly brand = "gan";
  private conn: GanCubeConnection | null = null;
  private sub: { unsubscribe(): void } | null = null;
  private moveCbs = new Set<(m: CubeMove) => void>();
  private discCbs = new Set<() => void>();
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    const { connectGanCube } = await import("gan-web-bluetooth");
    const conn = await connectGanCube(); // opens the browser device chooser
    this.conn = conn;
    this._connected = true;
    this.sub = conn.events$.subscribe((event) => {
      if (event.type === "DISCONNECT") {
        this.handleDisconnect();
        return;
      }
      const move = ganEventToCubeMove(event);
      if (move) this.moveCbs.forEach((cb) => cb(move));
    });
  }

  async disconnect(): Promise<void> {
    this.sub?.unsubscribe();
    this.sub = null;
    const conn = this.conn;
    this.handleDisconnect();
    await conn?.disconnect();
  }

  private handleDisconnect(): void {
    if (!this._connected) return;
    this._connected = false;
    this.conn = null;
    this.discCbs.forEach((cb) => cb());
  }

  onMove(cb: (m: CubeMove) => void): () => void {
    this.moveCbs.add(cb);
    return () => this.moveCbs.delete(cb);
  }

  onDisconnect(cb: () => void): () => void {
    this.discCbs.add(cb);
    return () => this.discCbs.delete(cb);
  }
}
