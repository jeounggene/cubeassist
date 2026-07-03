import type { CubeMove, SmartCube } from "./smartcube";

// A deterministic in-memory SmartCube for tests and keyboard-driven dev use.
// Timestamps are supplied by the caller so nothing here reads the clock.
export class SimulatorCube implements SmartCube {
  readonly brand = "simulator";
  private _connected = false;
  private moveCbs = new Set<(m: CubeMove) => void>();
  private discCbs = new Set<() => void>();

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    this._connected = false;
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

  // Test/dev helpers, not part of SmartCube.
  emit(m: CubeMove): void {
    this.moveCbs.forEach((cb) => cb(m));
  }

  feed(moves: CubeMove[]): void {
    moves.forEach((m) => this.emit(m));
  }
}
