# AGENTS.md

Guidance for AI coding agents working in this repository.

## Commands

### Development

- `pnpm dev` - Start development server with Vite
- `pnpm build` - Build production version
- `pnpm preview` - Preview production build

### Code Quality

- `pnpm lint` - Run Prettier and ESLint checks (also runs as a Husky pre-commit hook)
- `pnpm format` - Auto-format code with Prettier
- `pnpm check` - Run SvelteKit sync and TypeScript checks
- `pnpm check:watch` - Run checks in watch mode

Prettier config: double quotes, no trailing commas, 100-char print width, Tailwind class sorting.

### Database

- `pnpm migrate-dev` - Run Prisma migrations in development
- `pnpm migrate-prod` - Run Prisma migrations in production
- `pnpm migrate-create` - Create new Prisma migration without applying it
- `pnpm studio` - Open Prisma Studio for database management
- `pnpm prisma-generate` - Generate Prisma client (also runs on `postinstall`)

### Scripts

- `pnpm report:models` - Generate an HTML model-usage report (see `scripts/README.md`)
- `scripts/` also holds DB backup and conversation extraction helpers

## Architecture

### Tech Stack

- **Frontend**: SvelteKit with TypeScript (Svelte 5 with runes)
- **UI Components**: Shadcn-svelte components in `src/lib/components/ui/` (bits-ui, formsnap, sveltekit-superforms)
- **Styling**: TailwindCSS with PostCSS
- **Backend**: SvelteKit with adapter-node
- **Database**: MySQL/MariaDB with Prisma ORM
- **Queue**: Redis/Valkey with BullMQ for async job processing
- **Auth**: Clerk for user authentication (svelte-clerk)
- **Real-time**: Socket.io (port 4001, `SOCKET_PORT`) for import progress updates
- **AI SDK**: Vercel AI SDK v6 with provider-specific packages (@ai-sdk/\*, @openrouter/ai-sdk-provider)
- **Validation**: Zod v4
- **Data fetching (client)**: TanStack Svelte Query
- **Audio**: ElevenLabs SDK for TTS and transcription
- **Storage**: Cloudflare R2 via AWS S3 SDK
- **Email**: Resend (contact form)

### Key Systems

**AI Integration** (`src/lib/server/ai-service.ts`)

- `AIService` class handles all AI provider interactions
- Providers: OpenAI, Anthropic, Mistral, Google, xAI, OpenRouter
- Uses Vercel AI SDK's `streamText` for streaming responses with tool support (`stopWhen: stepCountIs(20)`)
- Temperature is not sent to any provider
- Thinking/reasoning is opt-in per request; Anthropic uses adaptive thinking with summarized display, Google includes thoughts via `thinkingConfig`
- Token management with automatic conversation summarization when 90% of the model's token limit is approached (`gpt-tokenizer` for counting)
- Also generates conversation titles and follow-up suggestions
- Two agent types: `default` (instruction-based) and `character` (roleplay with verbosity settings)
- System prompt built from `src/lib/data/` (base instructions, character prompt, tool use guidelines); users can override base instructions
- AI tools defined in `src/lib/server/tools/` (currentTime, webSearch, fetchWebpage, generateImage); web tools use the Exa API (`EXA_API_KEY`). Tools are built per request with `createTools()`
- Image generation: the chat model hands off to an image model via the `generateImage` tool. `src/lib/server/image-models.ts` holds the per-provider image model (OpenAI, Google, xAI, OpenRouter) and `selectImageModel` picks one from the user's API keys (chat model's provider first). The tool is only offered when a suitable key exists; its guidelines (`src/lib/data/image_generation_guidelines.md`) are spliced into the tool-use guidelines in that case. Generated images are uploaded to R2 and the tool output carries the R2 `key`, which the UI, R2 cleanup, and `formatMessageContent` read via `getGeneratedImage` in `src/lib/helpers/generated-image.ts`

**Model Registry and Sync** (`src/lib/server/models-service.ts`, `src/lib/server/model-sync.ts`)

- `Model` table holds capabilities: `tokenLimit`, `reasoningType`, `supportsTools`, `supportsImages`, `supportsVideo`, `adaptiveThinking`, `deprecated`, `releaseDate`
- Daily sync from models.dev (BullMQ cron job at 04:00 UTC, scheduled in `hooks.server.ts` in production only) adds new models with `reviewStatus: pending`
- Admins approve or reject pending models on the admin models page; "Sync now" triggers a manual sync in development
- Model picker sorts by `releaseDate`, newest first

**Conversation Management**

- Branching/threading via `parentId` on messages - supports tree-like conversation structures
- `currentNode` on Conversation tracks the active branch position
- Message parts stored as JSON (supports text, files, tool calls via AI SDK UIMessage format)
- Internal messages (`isInternal: true`) used for summaries, not shown in UI
- File/image/video attachments stored in R2; `parts` keep the R2 `key`, and `/api/chat` swaps in fresh presigned URLs before calling the model. Keys are prefixed with the user ID for ownership checks
- Video uploads (`/api/upload/video`) and YouTube links are sent to video-capable models (e.g. Gemini)
- Conversation import via BullMQ queue with Socket.io progress updates
- Sharing creates `SharedConversation`/`SharedMessage` snapshots served from public routes
- Folders, pinning, rewind, and follow-up suggestions are exposed via sub-routes of `/api/conversations/[id]/`

**Search** (`src/lib/server/search-helpers.ts`)

- `createFullTextSearchCondition` builds MariaDB `MATCH ... AGAINST` fragments for raw Prisma queries
- Unquoted terms require all words (AND) with partial matching; quoted terms are exact phrase matches
- Results carry a relevance score; conversation name matches outrank message content matches

**Admin Area** (`src/routes/(app)/admin/`, `src/lib/server/admin.ts`, `src/lib/server/admin-service.ts`)

- Gated by `User.isAdmin`; `requireAdmin` throws 404 (not 403) so the area is not advertised
- Pages: dashboard/analytics, users, models (review pending syncs), conversations

**Service Architecture** (`src/lib/server/`)

- `agents-service.ts` - Agent CRUD, visibility (public/private/hidden), forking
- `conversations-service.ts` - Conversation/message management, branching logic
- `ai-service.ts` - AI provider integration, streaming, summarization
- `models-service.ts` - Model registry queries, per-user model lists, review actions
- `image-models.ts` - Per-provider image generation models and selection from the user's API keys
- `model-sync.ts` - models.dev sync logic
- `admin-service.ts` / `admin.ts` - Admin data queries and the `requireAdmin` guard
- `users-service.ts` - User CRUD, synced from Clerk webhooks
- `api-keys-service.ts` - Per-user encrypted API key storage (including ElevenLabs)
- `folders-service.ts` - Folder organization for conversations
- `search-helpers.ts` - Full-text search SQL helpers
- `r2-storage.ts` - Cloudflare R2 uploads and presigned URLs
- `queue.ts` - BullMQ queues and workers (conversation import, model sync)
- `socket.ts` - Standalone Socket.io server for import progress
- `db/` - Prisma client singleton

**State Management** (`src/lib/stores/`)

- Svelte stores for client-side state
- `conversation-store.ts` - Active conversation state
- `audio-stores.ts`, `tts-*.ts`, `selected-voice.ts`, `selected-tts-model.ts`, `voices-store.ts` - TTS playback, selection, and persistence
- `search-params.ts` - URL search/sort parameter state
- `version-store.ts` - App version and update checks (`PUBLIC_APP_VERSION`)

### Routes

- `src/routes/(app)/` - Authenticated app: conversations, agents, folders, voices, TTS, settings, profile, admin
- `src/routes/(public)/` - Public pages: changelog, contact, getting-started, shared conversations
- `src/routes/auth/` - Clerk sign-in/sign-up
- `src/hooks.server.ts` - Clerk handler and production model-sync scheduling

### API Routes Pattern

- REST endpoints in `src/routes/api/`
- Chat streaming at `POST /api/chat`
- CRUD follows pattern: `/api/[resource]/` and `/api/[resource]/[id]/`; bulk operations at `/api/[resource]/bulk`
- Audio: `/api/tts`, `/api/tts-history`, `/api/tts-models`, `/api/voices`, `/api/transcribe` (ElevenLabs, user-supplied API key)
- Uploads: `/api/upload`, `/api/upload/video`, `/api/presigned-url`
- Clerk webhook at `/api/webhooks` for user sync (`WEBHOOK_SECRET`)

### Database Schema Highlights

- UUID-based IDs (CHAR(36)) for all entities; `User.id` and `Model.id` are external string IDs
- Full-text indexes on searchable fields (name, content, description)
- Enums: `AIProvider` (includes `elevenlabs`), `MessageRole`, `AgentType`, `AgentVerbosity`, `AgentVisibility`, `ReasoningType`, `ModelReviewStatus`
- Message-to-Message self-relation enables conversation branching
- Schema changes go through Prisma migrations (`pnpm migrate-create`, then `pnpm migrate-dev`)

### Environment

- Configuration via `.env`, read with `$env/dynamic/private` and `$env/dynamic/public`
- Key variables: `DATABASE_URL`, `REDIS_PASSWORD`, `SOCKET_PORT`, `WEBHOOK_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `EXA_API_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`, `PUBLIC_APP_VERSION`, `PUBLIC_ELEVENLABS_BASE_URL`, plus Clerk keys
- AI provider API keys are per-user (stored encrypted), not environment variables

### Deployment

- Docker Compose setup with MariaDB 11.4 and Valkey services
- Production startup script `run.sh` runs migrations then starts the Node server
- Multi-stage Docker build (Node 24, pinned pnpm) for optimized images
- `.dockerignore` excludes `*.md`, so this file is not shipped in the image

## Conventions

- User-facing changes get an entry in `src/lib/data/changelog.md` (rendered at `/changelog`); dated headings, newest first
- Use conventional commit prefixes (`feat(scope):`, `fix:`, `docs:`, `chore(deps):`, `build(docker):`)
- Run `pnpm lint` and `pnpm check` before committing
