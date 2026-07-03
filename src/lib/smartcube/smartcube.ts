// A minimal driver-agnostic smart-cube interface. A "move" is one quarter turn
// with a timestamp in ms (cube hardware clock if available, else performance.now()).

export type Face = "U" | "D" | "L" | "R" | "F" | "B";
export type CubeMove = { face: Face; dir: 1 | -1; t: number };

export interface SmartCube {
  readonly brand: string;
  readonly connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMove(cb: (m: CubeMove) => void): () => void; // returns unsubscribe
  onDisconnect(cb: () => void): () => void; // returns unsubscribe
}

// A CubeMove as a token facecube.applyAlg understands: "R", "U'", etc.
export function moveToken(m: CubeMove): string {
  return m.dir === -1 ? `${m.face}'` : m.face;
}
