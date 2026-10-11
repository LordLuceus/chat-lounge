import type { RequestEvent } from "@sveltejs/kit";

interface EventOptions {
  userId?: string | null;
  params?: Record<string, string>;
  body?: unknown;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}

/** A minimal SvelteKit request event for calling API handlers directly. */
export function requestEvent({
  userId = "user_1",
  params = {},
  body,
  url = "http://localhost/api",
  method = body === undefined ? "GET" : "POST",
  headers = {}
}: EventOptions = {}): RequestEvent {
  const request = new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return {
    locals: { auth: () => ({ userId }) },
    params,
    request,
    url: new URL(url)
  } as unknown as RequestEvent;
}
