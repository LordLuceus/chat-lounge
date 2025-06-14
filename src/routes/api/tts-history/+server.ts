import { env } from "$env/dynamic/public";
import { getApiKey } from "$lib/server/api-keys-service";
import { getUser } from "$lib/server/users-service";
import { AIProvider } from "$lib/types/db";
import type { ElevenLabsError, HistoryResponse } from "$lib/types/elevenlabs";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, request, url }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return error(401, "Unauthorized");
  }

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const apiKey = await getApiKey(user.id, AIProvider.ElevenLabs);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  const lastItemId = url.searchParams.get("lastItemId");

  const response = await fetch(
    `${env.PUBLIC_ELEVENLABS_BASE_URL}/history${lastItemId ? `?start_after_history_item_id=${lastItemId}` : ""}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey.key
      },
      signal: request.signal
    }
  );

  if (!response.ok) {
    const result: ElevenLabsError = await response.json();

    return error(response.status, result.detail.message);
  }

  const result: HistoryResponse = await response.json();

  return json(result);
}) satisfies RequestHandler;
