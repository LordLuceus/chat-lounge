import { WEBHOOK_SECRET } from "$env/static/private";
import { createUser, deleteUser, updateUser } from "$lib/server/users-service";
import type { WebhookEvent } from "@clerk/backend";
import type { Config } from "@sveltejs/adapter-vercel";
import { error, type RequestHandler } from "@sveltejs/kit";
import { Webhook } from "svix";

export const config: Config = { runtime: "edge" };

export const POST = (async ({ request }) => {
  const svixId = request.headers.get("Svix-Id");
  const svixTimestamp = request.headers.get("Svix-Timestamp");
  const svixSignature = request.headers.get("Svix-Signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return error(400, { message: "Missing headers" });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    }) as WebhookEvent;
  } catch (e) {
    return error(400, { message: "Failed to verify" });
  }

  switch (evt.type) {
    case "user.created":
      await createUser(evt.data);
      break;
    case "user.updated":
      await updateUser(evt.data);
      break;
    case "user.deleted":
      await deleteUser(evt.data.id);
      break;
    default:
      return error(400, { message: "Unknown event" });
  }

  return new Response("", { status: 200 });
}) satisfies RequestHandler;
