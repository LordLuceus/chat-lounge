import { checkForUpdates, setVersion } from "$lib/helpers/check-for-updates";
import type { HandleClientError } from "@sveltejs/kit";

setVersion();
checkForUpdates();

export const handleError: HandleClientError = async ({ error, event }) => {
  console.error(error, event);
};
