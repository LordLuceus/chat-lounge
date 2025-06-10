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
- **Frontend**: SvelteKit with TypeScript (Svelte 4)
- **UI Components**: Shadcn-svelte components in `src/lib/components/ui/`
- **Styling**: TailwindCSS with PostCSS
- **Backend**: SvelteKit with adapter-node
- **Database**: MySQL/MariaDB with Prisma ORM
- **Queue**: Redis/Valkey with BullMQ for async job processing
- **Auth**: Clerk for user authentication
- **Real-time**: Socket.io (port 4001) for import progress updates

### Key Systems

**AI Integration**
- Multiple providers: OpenAI, Anthropic, Mistral, Google
- Streaming chat responses with proper error handling
- Per-user API key management stored in database
- Agent system for AI personalities with custom instructions

**Conversation Management**
- Branching/threading support with parent-child message relationships
- Message editing and regeneration
- Conversation pinning and folder organization
- Public sharing functionality
- Full-text search on conversations and messages

**Service Architecture**
- Service layer pattern in `src/lib/server/`:
  - `agents-service.ts` - Agent CRUD operations
  - `conversations-service.ts` - Conversation and message management
  - `ai-service.ts` - AI provider integration
  - `api-keys-service.ts` - User API key management
  - `folders-service.ts` - Folder organization
- Database access through Prisma client in `src/lib/server/db/`
- Queue processing in `src/lib/server/queue.ts`

**Text-to-Speech**
- ElevenLabs integration for TTS
- Voice selection and management
- TTS history tracking
- Audio playback controls with stores in `src/lib/stores/audio-stores.ts`

### Database Schema Highlights
- UUID-based IDs for all entities
- Full-text indexes on searchable fields
- Enum types for roles, providers, and models
- Conversation-Message relationship supports threading

### Deployment
- Docker Compose setup with MariaDB and Valkey services
- Production startup script `run.sh` handles migrations and server start
- Multi-stage Docker build for optimized images
- Environment-based configuration via `.env` file