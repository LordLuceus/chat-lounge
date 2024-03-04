import { dev } from "$app/environment";
import { inject } from "@vercel/analytics";

export const config = { runtime: "edge" };

inject({ mode: dev ? "development" : "production" });
