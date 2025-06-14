import { deleteFolder, getFolder, updateFolder } from "$lib/server/folders-service";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;

  return json(await getFolder(userId, id!));
}) satisfies RequestHandler;

export const PUT = (async ({ locals, params, request }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;
  const data = await request.json();

  return json(await updateFolder(id!, data, userId));
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return error(401, "Unauthorized");

  const { id } = params;

  return json(await deleteFolder(userId, id!));
}) satisfies RequestHandler;
