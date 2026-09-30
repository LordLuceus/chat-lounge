import { requireAdmin } from "$lib/server/admin";
import { syncModels } from "$lib/server/model-sync";
import { getModelsForReview, reviewModel } from "$lib/server/models-service";
import { ModelReviewStatus, ReasoningType } from "@prisma/client";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

const REASONING_TYPES = Object.values(ReasoningType) as string[];

export const load: PageServerLoad = async ({ locals }) => {
  await requireAdmin(locals);

  const models = await getModelsForReview();

  return {
    pending: models.filter((m) => m.reviewStatus === ModelReviewStatus.pending),
    rejected: models.filter((m) => m.reviewStatus === ModelReviewStatus.rejected)
  };
};

function parseAdaptiveThinking(value: FormDataEntryValue | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export const actions: Actions = {
  approve: async ({ locals, request }) => {
    await requireAdmin(locals);
    const formData = await request.formData();
    const id = formData.get("id");
    const reasoningType = formData.get("reasoningType");

    if (typeof id !== "string" || !id) {
      return fail(400, { message: "Missing model ID" });
    }

    if (typeof reasoningType !== "string" || !REASONING_TYPES.includes(reasoningType)) {
      return fail(400, { message: "Invalid reasoning type", id });
    }

    const model = await reviewModel(id, ModelReviewStatus.approved, {
      reasoningType: reasoningType as ReasoningType,
      adaptiveThinking: parseAdaptiveThinking(formData.get("adaptiveThinking"))
    });

    return { message: `Approved ${model.name}. It is now visible to users.` };
  },

  reject: async ({ locals, request }) => {
    await requireAdmin(locals);
    const id = (await request.formData()).get("id");

    if (typeof id !== "string" || !id) {
      return fail(400, { message: "Missing model ID" });
    }

    const model = await reviewModel(id, ModelReviewStatus.rejected);

    return { message: `Rejected ${model.name}. The sync won't add it again.` };
  },

  restore: async ({ locals, request }) => {
    await requireAdmin(locals);
    const id = (await request.formData()).get("id");

    if (typeof id !== "string" || !id) {
      return fail(400, { message: "Missing model ID" });
    }

    const model = await reviewModel(id, ModelReviewStatus.pending);

    return { message: `Moved ${model.name} back to pending.` };
  },

  sync: async ({ locals }) => {
    await requireAdmin(locals);

    try {
      const result = await syncModels();
      const parts = [
        `Updated ${result.updated} existing models.`,
        result.added.length > 0
          ? `Added ${result.added.length} new models for review.`
          : "No new models found.",
        result.unmatched.length > 0
          ? `${result.unmatched.length} existing models weren't found on models.dev: ${result.unmatched.join(", ")}.`
          : ""
      ];
      return { message: parts.filter(Boolean).join(" ") };
    } catch (err) {
      console.error("[model-sync] Manual sync failed:", err);
      return fail(502, {
        message: `Sync failed: ${err instanceof Error ? err.message : "unknown error"}`
      });
    }
  }
};
