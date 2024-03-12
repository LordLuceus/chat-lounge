import type { RequestHandler } from "./$types";
import prisma from "$lib/prisma";
import { setDefaultVoice } from "$lib/settings/preferences";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params }) => {
  const { userId } = params;

  const preferences = await prisma.preference.findFirst({
    where: { userId }
  });

  return json(preferences);
};

export const POST: RequestHandler = async ({ params, request }) => {
  const { userId } = params;
  const { voiceId } = await request.json();

  const preferences = await setDefaultVoice(userId, voiceId);

  return json(preferences);
};
