import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// SvelteKit runtime modules are not available outside the app; components
// under test get inert stand-ins. Individual tests can override these with
// their own vi.mock calls.
vi.mock("$app/environment", () => ({ browser: true, dev: true, building: false }));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(async () => {}),
  afterNavigate: vi.fn(),
  beforeNavigate: vi.fn(),
  invalidate: vi.fn(async () => {}),
  invalidateAll: vi.fn(async () => {})
}));

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/"), data: {}, params: {} }
}));

vi.mock("$env/dynamic/public", () => ({ env: {} }));

// Web storage: jsdom only provides it for a non-opaque origin, and newer Node
// versions define their own `localStorage` global that is undefined unless a
// storage file is configured, which Vitest's jsdom environment then keeps.
// Make sure both storages exist as plain in-memory stores when they are
// missing, so components using PersistedState and persisted stores mount.
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(String(key)) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(String(key)),
    setItem: (key, value) => void data.set(String(key), String(value))
  };
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  let existing: Storage | undefined;
  try {
    existing = window[name];
  } catch {
    existing = undefined;
  }
  if (existing && typeof existing.getItem === "function") continue;
  const storage = memoryStorage();
  for (const target of new Set<object>([window, globalThis])) {
    Object.defineProperty(target, name, { configurable: true, writable: true, value: storage });
  }
}

// jsdom has no media playback; the chat plays short sounds on start/finish.
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: vi.fn(() => Promise.resolve())
});
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: vi.fn()
});

// Keep jsdom quiet about layout APIs that Radix-style UI primitives call.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
