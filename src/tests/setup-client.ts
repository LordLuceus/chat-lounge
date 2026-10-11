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
