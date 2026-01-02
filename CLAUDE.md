# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start development server with Vite
- `pnpm build` - Build production version
- `pnpm preview` - Preview production build

### Code Quality
- `pnpm lint` - Run Prettier and ESLint checks
- `pnpm format` - Auto-format code with Prettier
- `pnpm check` - Run SvelteKit sync and TypeScript checks
- `pnpm check:watch` - Run checks in watch mode

### Database
- `pnpm migrate-dev` - Run Prisma migrations in development
- `pnpm migrate-prod` - Run Prisma migrations in production
- `pnpm migrate-create` - Create new Prisma migration
- `pnpm studio` - Open Prisma Studio for database management
- `pnpm prisma-generate` - Generate Prisma client

## Architecture

### Tech Stack
- **Frontend**: SvelteKit with TypeScript (Svelte 5 with runes)
- **UI Components**: Shadcn-svelte components in `src/lib/components/ui/`
- **Styling**: TailwindCSS with PostCSS
- **Backend**: SvelteKit with adapter-node
- **Database**: MySQL/MariaDB with Prisma ORM
- **Queue**: Redis/Valkey with BullMQ for async job processing
- **Auth**: Clerk for user authentication (svelte-clerk)
- **Real-time**: Socket.io (port 4001) for import progress updates
- **AI SDK**: Vercel AI SDK v6 with provider-specific packages (@ai-sdk/*)

### Key Systems

**AI Integration** (`src/lib/server/ai-service.ts`)
- `AIService` class handles all AI provider interactions
- Providers: OpenAI, Anthropic, Mistral, Google, xAI, OpenRouter
- Uses Vercel AI SDK's `streamText` for streaming responses with tool support
- Token management with automatic conversation summarization when limit approached
- Two agent types: `default` (instruction-based) and `character` (roleplay with verbosity settings)
- AI tools defined in `src/lib/server/tools/` (currentTime, webSearch)

**Conversation Management**
- Branching/threading via `parentId` on messages - supports tree-like conversation structures
- `currentNode` on Conversation tracks the active branch position
- Message parts stored as JSON (supports text, files, tool calls via AI SDK UIMessage format)
- Internal messages (`isInternal: true`) used for summaries, not shown in UI
- Conversation import via BullMQ queue with Socket.io progress updates

**Service Architecture** (`src/lib/server/`)
- `agents-service.ts` - Agent CRUD, visibility (public/private/hidden)
- `conversations-service.ts` - Conversation/message management, branching logic
- `ai-service.ts` - AI provider integration, streaming, summarization
- `api-keys-service.ts` - Per-user encrypted API key storage
- `folders-service.ts` - Folder organization for conversations
- `models-service.ts` - AI model registry with capabilities (tools, images, reasoning)
- `r2-storage.ts` - Cloudflare R2 for file uploads
- `queue.ts` - BullMQ worker for async conversation imports

**State Management** (`src/lib/stores/`)
- Svelte stores for client-side state
- `conversation-store.ts` - Active conversation state
- `audio-stores.ts` - TTS playback controls
- `voices-store.ts` - Voice selection persistence

### API Routes Pattern
- REST endpoints in `src/routes/api/`
- Chat streaming at `POST /api/chat`
- CRUD follows pattern: `/api/[resource]/` and `/api/[resource]/[id]/`
- Clerk webhook at `/api/webhooks` for user sync

### Database Schema Highlights
- UUID-based IDs (CHAR(36)) for all entities
- Full-text indexes on searchable fields (name, content, description)
- Enums: `AIProvider`, `MessageRole`, `AgentType`, `AgentVisibility`, `ReasoningType`
- Message-to-Message self-relation enables conversation branching

### Deployment
- Docker Compose setup with MariaDB and Valkey services
- Production startup script `run.sh` handles migrations and server start
- Multi-stage Docker build for optimized images
- Environment-based configuration via `.env` file