import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

// Two projects: `server` runs plain TypeScript (services, helpers, API
// handlers) under Node; `client` runs Svelte components under jsdom with the
// browser build of Svelte. Component tests are named `*.svelte.test.ts`.
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.ts"],
          exclude: ["src/**/*.svelte.{test,spec}.ts"],
          setupFiles: ["src/tests/setup-server.ts"]
        }
      },
      {
        extends: true,
        resolve: { conditions: ["browser"] },
        test: {
          name: "client",
          environment: "jsdom",
          include: ["src/**/*.svelte.{test,spec}.ts"],
          setupFiles: ["src/tests/setup-client.ts"]
        }
      }
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.{ts,svelte}", "src/routes/api/**/*.ts"],
      exclude: ["src/lib/components/ui/**", "src/lib/types/**", "src/tests/**"]
    }
  }
});
