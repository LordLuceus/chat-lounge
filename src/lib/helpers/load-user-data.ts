import { getAgents } from "$lib/server/agents-service";
import { getApiKeys } from "$lib/server/api-keys-service";
import { getProviderModels } from "$lib/server/models-service";
import type { Voice } from "$lib/types/elevenlabs/voices";
import type { RequestEvent } from "@sveltejs/kit";

interface LoadOptions {
  agents?: boolean;
  models?: boolean;
  voices?: boolean;
}

interface Data {
  agents?: {
    id: string;
    name: string;
    description: string | null;
    instructions: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
  }[];
  models?: {
    value: string;
    label: string;
  }[];
  voices?: Voice[];
}

export const loadUserData = async (
  event: RequestEvent,
  options: LoadOptions = { agents: true, models: true, voices: true }
): Promise<Data> => {
  const { session } = event.locals;
  const { agents, models, voices } = options;

  if (session?.userId) {
    const data: Data = {};

    if (agents) {
      data.agents = await getAgents(session.userId);
    }

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
