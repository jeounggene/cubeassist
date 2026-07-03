import type { SmartCube, CubeMove, Face } from "./smartcube";
import type { GanCubeConnection, GanCubeEvent } from "gan-web-bluetooth";

const FACES = new Set<Face>(["U", "D", "L", "R", "F", "B"]);

const MAC_STORAGE_KEY = "cubeassist:gan-mac";

// Validate/normalise a user-entered MAC to "AA:BB:CC:DD:EE:FF", or null if invalid.
export function normalizeMac(input: string): string | null {
  const mac = input.trim().toUpperCase().replace(/-/g, ":");
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac) ? mac : null;
}

// Forget a previously-entered MAC (so the user can re-enter after a typo).
export function clearGanMac(): void {
  localStorage.removeItem(MAC_STORAGE_KEY);
}

// GAN cubes encrypt their BLE stream with a key salted by the cube's MAC address,
// which Web Bluetooth doesn't expose. `connectGanCube` first tries to read it from
// advertisement data (needs the browser's experimental watchAdvertisements support);
// when that's unavailable it calls this back with isFallbackCall=true, and we ask the
// user for the MAC (once — then cache it for future connects).
async function macAddressProvider(_device: unknown, isFallbackCall?: boolean): Promise<string | null> {
  const cached = localStorage.getItem(MAC_STORAGE_KEY);
  // First pass: reuse a saved MAC if we have one, else let auto-detect run.
  if (!isFallbackCall) return cached;
  // Fallback pass: auto-detect failed. Prompt the user (prefill with any saved value).
  const entered = window.prompt(
    "Enter your GAN cube's Bluetooth MAC address (e.g. AB:12:CD:34:EF:56).\n" +
      "Find it in the GAN Smart / Cube Station app, or a BLE scanner such as nRF Connect.",
    cached ?? "",
  );
  if (entered == null) return null;
  const mac = normalizeMac(entered);
  if (mac) localStorage.setItem(MAC_STORAGE_KEY, mac);
  return mac;
}

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
    // Pass a MAC provider so connection still works when the browser can't
    // auto-detect the cube's MAC via advertisement data (the common case).
    const conn = await connectGanCube(macAddressProvider); // opens the browser device chooser
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
