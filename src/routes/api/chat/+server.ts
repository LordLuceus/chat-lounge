import { AIProvider } from "$lib/drizzle/schema";
import { getApiKey } from "$lib/server/api-keys-service";
import { getMistralResponse } from "$lib/server/mistral-service";
import { getModel } from "$lib/server/models-service";
import { getOpenAIResponse } from "$lib/server/openai-service";
import { getUser } from "$lib/server/users-service";
import { error, type RequestHandler } from "@sveltejs/kit";

export const config = { runtime: "edge" };

export const POST = (async ({ locals, request }) => {
  if (!locals.session?.userId) {
    return error(401, { message: "Unauthorized" });
  }

  const { messages, model } = await request.json();
  const { userId } = locals.session;

  const user = await getUser(userId);

  if (!user) {
    return error(404, { message: "User not found" });
  }

  const modelRecord = await getModel(model);

  if (!modelRecord) {
    return error(404, { message: "Model not found" });
  }

  const apiKey = await getApiKey(user.id, modelRecord.provider as AIProvider);

  if (!apiKey) {
    return error(404, { message: "API key not found" });
  }

  if (modelRecord.provider === "mistral") {
    return getMistralResponse(apiKey.key, messages, modelRecord);
  }

  if (modelRecord.provider === "openai") {
    return getOpenAIResponse(apiKey.key, messages, modelRecord);
  }

  return error(500, { message: "Invalid model provider" });
}) satisfies RequestHandler;
