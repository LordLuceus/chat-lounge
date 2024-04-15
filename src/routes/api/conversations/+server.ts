import {
  createConversation,
  getRecentConversations,
  type ConversationCreateOptions
} from "$lib/server/conversations-service";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const config: Config = { runtime: "edge" };

export const GET = (async ({ locals }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  return json(await getRecentConversations(userId));
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const data: ConversationCreateOptions = await request.json();
  data.userId = userId;

  return json(await createConversation(data), { status: 201 });
}) satisfies RequestHandler;
