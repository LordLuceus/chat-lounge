import { getApiKeys } from "$lib/server/api-keys-service";
import { getProviderModels } from "$lib/server/models-service";
import type { Voice } from "$lib/types/elevenlabs/voices";
import type { RequestEvent } from "@sveltejs/kit";

interface LoadOptions {
  models?: boolean;
  voices?: boolean;
}

interface Data {
  models?: {
    value: string;
    label: string;
  }[];
  voices?: Voice[];
}

export const loadUserData = async (
  event: RequestEvent,
  options: LoadOptions = { models: true, voices: true }
): Promise<Data> => {
  const { session } = event.locals;
  const { models, voices } = options;

  if (session?.userId) {
    const data: Data = {};

    if (models) {
      const apiKeys = await getApiKeys(session.userId);

      if (apiKeys.length === 0) {
        data.models = [];
      } else {
        const providers = apiKeys.map((key) => key.provider);

        data.models = await getProviderModels(providers);
      }
    }

    if (voices) {
      const voiceResponse = await event.fetch("/api/voices");

      if (voiceResponse.ok) {
        data.voices = await voiceResponse.json();
      } else {
        data.voices = [];
      }
    }

    return data;
  }

  return {};
};
