import { vi } from "vitest";

// Server modules read configuration through SvelteKit's dynamic env; tests
// supply what they need per file. Nothing here should ever reach a database:
// the Prisma client is replaced in every test that touches a service.
vi.mock("$env/dynamic/private", () => ({ env: {} }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
