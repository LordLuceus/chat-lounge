import { deleteFolder, getFolder, updateFolder } from "$lib/server/folders-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, params }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;

  return json(await getFolder(userId, id!));
}) satisfies RequestHandler;

export const PUT = (async ({ locals, params, request }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;
  const data = await request.json();

  return json(await updateFolder(id!, data, userId));
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params }) => {
  if (!locals.session?.userId) return error(401, "Unauthorized");

  const { userId } = locals.session;
  const { id } = params;

  return json(await deleteFolder(userId, id!));
}) satisfies RequestHandler;
