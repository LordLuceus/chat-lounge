import { tts } from "$lib/elevenlabs";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

export const POST = (async ({ request }) => {
  const { text } = await request.json();

  try {
    const response = await tts(text);
    return new Response(response);
  } catch (e) {
    throw error(500, { message: "An error occurred while fetching text to speech" });
  }
}) satisfies RequestHandler;
