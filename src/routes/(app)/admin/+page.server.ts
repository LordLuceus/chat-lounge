import { requireAdmin } from "$lib/server/admin";
import {
  ANALYTICS_RANGES,
  getConversationAnalytics,
  parseAnalyticsRange
} from "$lib/server/admin-service";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  await requireAdmin(locals);

  const range = parseAnalyticsRange(url.searchParams.get("range"));

  return {
    range,
    ranges: Object.entries(ANALYTICS_RANGES).map(([value, { label }]) => ({ value, label })),
    analytics: await getConversationAnalytics(range)
  };
};
