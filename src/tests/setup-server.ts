import { vi } from "vitest";

// Server modules read configuration through SvelteKit's dynamic env; tests
// supply what they need per file. Nothing here should ever reach a database:
// the Prisma client is replaced in every test that touches a service.
// API keys are encrypted at rest, so the services need a key; this one is for tests only.
vi.mock("$env/dynamic/private", () => ({
  env: { API_KEY_ENCRYPTION_KEY: "Y2hhdC1sb3VuZ2UtdGVzdC1lbmNyeXB0aW9uLWtleSE=" }
}));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
