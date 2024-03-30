import { getAgents } from "$lib/server/agents-service";
import type { Voice } from "$lib/types/elevenlabs/voices";
import type { RequestEvent } from "@sveltejs/kit";

interface LoadOptions {
  agents?: boolean;
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
  voices?: Voice[];
}

export const loadUserData = async (
  event: RequestEvent,
  options: LoadOptions = { agents: true, voices: true }
): Promise<Data> => {
  const { session } = event.locals;
  const { agents, voices } = options;

  if (session?.userId) {
    const data: Data = {};

    if (agents) {
      data.agents = await getAgents(session.userId);
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
