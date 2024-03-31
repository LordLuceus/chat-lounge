import { dev } from "$app/environment";
import type { Config } from "@sveltejs/adapter-vercel";
import { inject } from "@vercel/analytics";

export const config: Config = { runtime: "edge" };

inject({ mode: dev ? "development" : "production" });
