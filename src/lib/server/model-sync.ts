import { prisma } from "$lib/server/db";
import { AIProvider, ModelReviewStatus, ReasoningType } from "@prisma/client";
import { z } from "zod";

const MODELS_DEV_URL = "https://models.dev/api.json";

/** Only models released within this window are added as new pending models. */
const NEW_MODEL_WINDOW_MONTHS = 6;

/** Providers the sync reads from models.dev. New models from all of them go to review. */
const SYNCED_PROVIDERS: AIProvider[] = [
  AIProvider.openai,
  AIProvider.anthropic,
  AIProvider.google,
  AIProvider.mistral,
  AIProvider.xai,
  AIProvider.openrouter
];

/**
 * OpenRouter model ID prefixes to skip when adding: vendors Chat Lounge
 * connects to directly, so their OpenRouter copies would be duplicates, plus
 * OpenRouter's own routing models.
 */
const OPENROUTER_EXCLUDED_PREFIXES = [
  "openai/",
  "anthropic/",
  "google/",
  "x-ai/",
  "mistralai/",
  "openrouter/"
];

/** models.dev has no "chat model" flag, so non-chat models are excluded by ID. */
const NON_CHAT_ID_PATTERN =
  /embed|tts|whisper|transcri|moderation|realtime|audio|image|video|voxtral/i;

const reasoningOptionSchema = z.object({ type: z.string() }).loose();

const modelsDevModelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tool_call: z.boolean().optional(),
    reasoning: z.boolean().optional(),
    reasoning_options: z.array(reasoningOptionSchema).optional(),
    release_date: z.string().optional(),
    status: z.string().optional(),
    canonical_model_id: z.string().optional(),
    modalities: z
      .object({
        input: z.array(z.string()),
        output: z.array(z.string())
      })
      .optional(),
    limit: z.object({ context: z.number() }).loose().optional()
  })
  .loose();

const modelsDevProviderSchema = z
  .object({
    models: z.record(z.string(), modelsDevModelSchema)
  })
  .loose();

const modelsDevSchema = z.record(z.string(), z.unknown());

type ModelsDevModel = z.infer<typeof modelsDevModelSchema>;

export interface ModelSyncResult {
  updated: number;
  added: string[];
  unmatched: string[];
}

/** Google's SDK accepts IDs with or without the `models/` prefix, so compare without it. */
function normalizeId(provider: AIProvider, id: string): string {
  return provider === AIProvider.google ? id.replace(/^models\//, "") : id;
}

function isChatModel(model: ModelsDevModel): boolean {
  const input = model.modalities?.input ?? [];
  const output = model.modalities?.output ?? [];
  return input.includes("text") && output.length === 1 && output[0] === "text";
}

/**
 * For direct providers, excludes models they host for someone else, e.g.
 * Z.ai's GLM on Mistral. OpenRouter is all third-party by design, so it's
 * filtered by vendor prefix instead, and its `:free` / `:thinking` style
 * variants are skipped in favour of the base model.
 */
function isWantedSource(provider: AIProvider, model: ModelsDevModel): boolean {
  if (provider === AIProvider.openrouter) {
    if (model.id.includes(":")) return false;
    return !OPENROUTER_EXCLUDED_PREFIXES.some((prefix) => model.id.startsWith(prefix));
  }
  if (!model.canonical_model_id) return true;
  return model.canonical_model_id.startsWith(`${provider}/`);
}

function isEligibleForAdding(provider: AIProvider, model: ModelsDevModel, cutoff: Date): boolean {
  if (model.status === "deprecated") return false;
  if (model.id.endsWith("-latest")) return false;
  if (NON_CHAT_ID_PATTERN.test(model.id)) return false;
  if (!isChatModel(model)) return false;
  if (!isWantedSource(provider, model)) return false;
  if (!model.release_date) return false;
  return new Date(model.release_date) >= cutoff;
}

/**
 * Best guess only; an admin reviews it before the model is visible.
 * A "toggle" option means thinking can be switched off (hybrid); reasoning
 * without one is treated as always on (full). Anthropic is the exception:
 * models.dev omits the toggle for most Claude models, but AIService can
 * always send `thinking: { type: "disabled" }`, so Claude reasoning models
 * are hybrid, matching every Claude model added by hand.
 */
function inferReasoningType(provider: AIProvider, model: ModelsDevModel): ReasoningType {
  if (!model.reasoning) return ReasoningType.none;
  if (provider === AIProvider.anthropic) return ReasoningType.hybrid;
  const types = (model.reasoning_options ?? []).map((option) => option.type);
  return types.includes("toggle") ? ReasoningType.hybrid : ReasoningType.full;
}

/**
 * Best guess only. Newer Claude models list effort levels without a
 * budget_tokens option, which is how models.dev describes adaptive thinking.
 */
function inferAdaptiveThinking(provider: AIProvider, model: ModelsDevModel): boolean | null {
  if (provider !== AIProvider.anthropic || !model.reasoning) return null;
  const types = (model.reasoning_options ?? []).map((option) => option.type);
  return types.includes("effort") && !types.includes("budget_tokens");
}

/**
 * Fields refreshed from models.dev on every sync. Name and token limit are
 * deliberately not here: they're set once when a model is added, because
 * names are curated by hand and models.dev's context limits are sometimes
 * wrong (it lists Claude Sonnet 4.5 at 1M; Anthropic documents 200k), and
 * summarisation relies on tokenLimit. Deprecation only goes one way: a
 * model deprecated by hand stays deprecated even if models.dev still lists it.
 */
function syncedFields(model: ModelsDevModel) {
  return {
    ...(model.tool_call !== undefined && { supportsTools: model.tool_call }),
    ...(model.modalities && {
      supportsImages: model.modalities.input.includes("image"),
      supportsVideo: model.modalities.input.includes("video")
    }),
    ...(model.status === "deprecated" && { deprecated: true }),
    ...(model.release_date && { releaseDate: new Date(model.release_date) })
  };
}

async function fetchModelsDev(): Promise<Map<AIProvider, Map<string, ModelsDevModel>>> {
  const response = await fetch(MODELS_DEV_URL, { signal: AbortSignal.timeout(30_000) });

  if (!response.ok) {
    throw new Error(`models.dev returned ${response.status} ${response.statusText}`);
  }

  const data = modelsDevSchema.parse(await response.json());
  const result = new Map<AIProvider, Map<string, ModelsDevModel>>();

  for (const provider of SYNCED_PROVIDERS) {
    const parsed = modelsDevProviderSchema.safeParse(data[provider]);

    if (!parsed.success) {
      console.warn(`[model-sync] Skipping provider ${provider}: unexpected data shape`);
      continue;
    }

    const models = new Map<string, ModelsDevModel>();
    for (const model of Object.values(parsed.data.models)) {
      models.set(normalizeId(provider, model.id), model);
    }
    result.set(provider, models);
  }

  return result;
}

/**
 * Syncs the model table with models.dev.
 *
 * - Existing models get their tool, image, and video support, deprecation, and
 *   release date refreshed. Name, token limit, reasoning settings, and review
 *   status are never touched, so manual fixes stick.
 * - New chat models released within the last six months are added as
 *   pending until an admin approves them. For OpenRouter, only vendors
 *   Chat Lounge doesn't connect to directly are added.
 * - If models.dev can't be fetched, nothing is changed.
 */
export async function syncModels(): Promise<ModelSyncResult> {
  const catalogue = await fetchModelsDev();
  const existing = await prisma.model.findMany({
    where: { provider: { in: SYNCED_PROVIDERS } }
  });

  const result: ModelSyncResult = { updated: 0, added: [], unmatched: [] };
  const known = new Set<string>();

  for (const model of existing) {
    const provider = model.provider;
    const normalizedId = normalizeId(provider, model.id);
    known.add(`${provider}:${normalizedId}`);

    const providerModels = catalogue.get(provider);
    if (!providerModels) continue;

    const source = providerModels.get(normalizedId);
    if (!source) {
      result.unmatched.push(`${provider}:${model.id}`);
      continue;
    }

    await prisma.model.update({ where: { id: model.id }, data: syncedFields(source) });
    result.updated++;
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - NEW_MODEL_WINDOW_MONTHS);

  for (const [provider, providerModels] of catalogue) {
    for (const [normalizedId, model] of providerModels) {
      if (known.has(`${provider}:${normalizedId}`)) continue;
      const tokenLimit = model.limit?.context;
      if (!tokenLimit || !isEligibleForAdding(provider, model, cutoff)) continue;

      // Model IDs are the primary key across providers; skip rather than collide.
      const clash = await prisma.model.findUnique({ where: { id: model.id } });
      if (clash) continue;

      await prisma.model.create({
        data: {
          id: model.id,
          provider,
          ...syncedFields(model),
          name: model.name,
          tokenLimit,
          reasoningType: inferReasoningType(provider, model),
          adaptiveThinking: inferAdaptiveThinking(provider, model),
          reviewStatus: ModelReviewStatus.pending
        }
      });
      result.added.push(`${provider}:${model.id}`);
    }
  }

  console.log(
    `[model-sync] Updated ${result.updated}, added ${result.added.length} pending, ` +
      `${result.unmatched.length} not found on models.dev`
  );
  if (result.unmatched.length > 0) {
    console.log(`[model-sync] Not found on models.dev: ${result.unmatched.join(", ")}`);
  }

  return result;
}
