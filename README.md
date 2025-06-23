# Chat Lounge

A full-featured AI chat application built with SvelteKit, supporting multiple AI providers, conversation management, and advanced features like TTS and voice recording.

## Features

### 🤖 AI Integration

- **Multiple AI Providers**: OpenAI, Anthropic, Mistral, Google
- **Streaming Responses**: Real-time chat with proper error handling
- **Custom Agents**: Create AI personalities with custom instructions
- **Per-user API Keys**: Secure API key management

### 💬 Conversation Management

- **Branching/Threading**: Parent-child message relationships
- **Message Editing**: Edit and regenerate messages
- **Organization**: Pin conversations and organize with folders
- **Sharing**: Public conversation sharing
- **Search**: Full-text search across conversations and messages

### 🔊 Audio Features

- **Text-to-Speech**: ElevenLabs integration with voice selection
- **Voice Recording**: Built-in voice recording capabilities
- **Audio Controls**: Playback controls with audio stores

### 🏗️ Architecture

- **Frontend**: SvelteKit with TypeScript
- **UI**: Shadcn-svelte components with TailwindCSS
- **Backend**: SvelteKit with adapter-node
- **Database**: MySQL/MariaDB with Prisma ORM
- **Queue**: Redis/Valkey with BullMQ for async processing
- **Auth**: Clerk authentication
- **Real-time**: Socket.io for live updates

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- MySQL/MariaDB
- Redis/Valkey

### Installation

1. Clone the repository:

```bash
git clone https://github.com/lordluceus/chat-lounge.git
cd chat-lounge
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:

```bash
pnpm migrate-dev
```

5. Start development server:

```bash
pnpm dev
```

## Development Commands

### Core Development

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
```

### Code Quality

```bash
pnpm lint         # Run Prettier and ESLint checks
pnpm format       # Auto-format code
pnpm check        # Run SvelteKit sync and TypeScript checks
pnpm check:watch  # Run checks in watch mode
```

### Database

```bash
pnpm migrate-dev     # Run migrations in development
pnpm migrate-prod    # Run migrations in production
pnpm migrate-create  # Create new migration
pnpm studio         # Open Prisma Studio
pnpm prisma-generate # Generate Prisma client
```

## Docker Deployment

The project includes Docker Compose setup with MariaDB and Valkey services:

```bash
docker-compose up -d
```

For production deployment, use the included `run.sh` script which handles migrations and server startup.

## Project Structure

```
src/
├── lib/
│   ├── components/        # Svelte components
│   ├── server/           # Server-side services
│   │   ├── agents-service.ts
│   │   ├── conversations-service.ts
│   │   ├── ai-service.ts
│   │   └── ...
│   ├── stores/           # Svelte stores
│   ├── types/            # TypeScript definitions
│   └── utils.ts
├── routes/
│   ├── (app)/           # Main application routes
│   ├── api/             # API endpoints
│   └── auth/            # Authentication pages
└── ...
```

### Key Services

- **AI Service**: Handles multiple AI provider integration
- **Conversations Service**: Manages conversations and messages
- **Agents Service**: CRUD operations for AI agents
- **Queue Service**: Background job processing with BullMQ
- **TTS Service**: Text-to-speech functionality

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL`: MySQL/MariaDB connection string
- `REDIS_URL`: Redis/Valkey connection string
- `CLERK_SECRET_KEY`: Clerk authentication key
- API keys for AI providers (stored per-user in database)

## Contributing

1. Follow the existing code style and conventions
2. Run `pnpm lint` and `pnpm check` before committing
3. Write meaningful commit messages
4. Test your changes thoroughly

## Tech Stack

- **Framework**: SvelteKit
- **Language**: TypeScript
- **Styling**: TailwindCSS + PostCSS
- **UI Components**: Shadcn-svelte
- **Database**: Prisma ORM with MySQL/MariaDB
- **Queue**: BullMQ with Redis/Valkey
- **Authentication**: Clerk
- **Real-time**: Socket.io
- **AI SDKs**: Vercel AI SDK with multiple providers
- **Audio**: ElevenLabs for TTS
