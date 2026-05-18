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
