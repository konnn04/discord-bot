# FoxyBot — Discord Bot & Web Dashboard Architecture & AI Instructions

Welcome to the **FoxyBot** repository. This project is a modern, high-performance monorepo managed by `pnpm workspaces`.
Follow these core architectural rules, design patterns, and conventions when generating code, navigating, or assisting with this codebase.

---

## 🏗️ Repository & Workspace Structure

```
discord-bot/
├── apps/
│   ├── api/                  # NestJS 11 backend & Discord bot logic
│   │   ├── prisma/           # Prisma ORM schema & migrations (PostgreSQL)
│   │   └── src/
│   │       ├── main.ts       # Application entrypoint & Swagger setup
│   │       └── modules/
│   │           ├── auth/     # Discord OAuth2 & JWT session management
│   │           ├── discord/  # Discord bot core (commands, events, actions, chatbot, music)
│   │           ├── giftcode/ # Unified giftcode notification dispatcher
│   │           ├── giftcode-crawler/ # Web scraper for non-HoYoverse games
│   │           ├── guilds/   # Server management & settings REST endpoints
│   │           ├── meetings/ # Voice meeting tracking & public reports
│   │           ├── michosgc/ # HoYoverse API poller (Genshin, HSR, HI3, ZZZ, ToT)
│   │           ├── presence/ # Lanyard-compatible public presence REST API
│   │           ├── prisma/   # PrismaService database client
│   │           ├── settings/ # In-memory caching & persistence for settings
│   │           └── xp/       # XP tracking buffer & leaderboard calculations
│   └── web/                  # React 19 + Vite 7 frontend dashboard
│       └── src/
│           ├── components/   # UI components (shadcn/ui, layout, forms)
│           ├── hooks/        # Custom React hooks
│           ├── lib/          # Utilities, API client, route definitions
│           ├── pages/        # Dashboard, settings, music controller, reports
│           └── routes/       # React Router 7 route definitions
├── packages/
│   └── shared/               # Shared types, interfaces, schemas, and constants
│       └── src/
│           └── types/        # settings.types.ts, discord.types.ts, api.types.ts, music.types.ts
├── Dockerfile                # Multi-stage production container build
├── docker-compose.yml        # Production stack (API, Web, PostgreSQL, Redis)
└── docker-compose.local.yml  # Local dev helper services
```

---

## 💡 Core Principles & Architectural Patterns

### 1. Types & Shared Package (`packages/shared`)
- **Single Source of Truth**: All types, interfaces, enums, and constants shared between the backend (`apps/api`) and frontend (`apps/web`) **MUST** reside in `packages/shared/src/types`.
- **Never duplicate types** across `apps/api` and `apps/web`.
- Use the `shared` path mapping (e.g., `import type { GuildSettings, LlmProviderType } from 'shared/src/types/settings.types'`).
- When adding or modifying shared types, ensure `pnpm --filter shared build` compiles successfully.

### 2. Database & Persistence (Prisma + PostgreSQL)
- Prisma is strictly located inside `apps/api/prisma/schema.prisma`.
- Database engine: **PostgreSQL**.
- Guild and Global settings are stored as structured `JSONB` in the `Guild` and `GlobalSetting` models, never as local filesystem files.
- Dedicated relational models are used for:
  - `User`, `GuildMember`, `GuildMemberXp` (XP & Leaderboard history per month/year)
  - `GuildMemory` (per-guild long-term memory for AI chatbot)
  - `MeetingReport` (voice meeting session attendance)
  - `MusicHistory` (playback logs for user recommendations)
  - `GiftcodeCache` (hash-based deduplication)
  - `PublicPresence`, `OnlinePresenceLog` (presence snapshots)
  - `StalkerSubscription`, `StalkerOptOut` (social activity tracking)
  - `AnimeTrack`, `AnimeEpisodeNotified` (anime broadcast schedules)
  - `ConfessionConfig`, `ConfessionLog` (anonymous confessions)

### 3. Action Pattern (Presentation-Agnostic Business Logic)
To maintain clean separation of concerns and avoid code duplication:
- Core business operations are encapsulated as **Actions** in `apps/api/src/modules/discord/actions/` (e.g. music playback, voice channel operations, member management, giftcode lookups, memory search).
- Every action accepts a normalized `ActionContext` (`guild`, `actor`, `client`, `deps`, `voiceChannel`, `textChannelId`) and returns an `ActionResult<T>` (`{ ok, message, data }`).
- **Slash Commands** (`commands/`) and **AI Chatbot Tools** (`chatbot/tools.ts`) both invoke the exact same action handlers.
- Chatbot tool schemas (`ToolSchema`) are co-located with their corresponding actions.

### 4. Settings System: Hybrid In-Memory + PostgreSQL
- High-frequency Discord events require zero-latency configuration access.
- `GuildSettingsService` and `GlobalSettingsService` load settings into in-memory `Map` caches on startup and invalidate/update them on mutations.
- Reads during message handling, voice tracking, and command execution are **synchronous in-memory lookups**.
- Mutations asynchronously persist to PostgreSQL `JSONB` and update the local memory cache.

### 5. XP & Leveling: In-Memory Batch Buffer
- Voice states and message events generate high-frequency XP events.
- `XpBufferService` accumulates XP increments in an in-memory buffer.
- A scheduled cron job flushes all accumulated increments in bulk every 30 seconds using a Prisma `$transaction`, minimizing database contention.
- Role Rank automatically awards non-stacking Discord roles when members cross configured level thresholds.
- Dynamic rank cards and welcome cards are rendered on the backend using `@napi-rs/canvas`.

### 6. AI Chatbot & Memory Architecture
- **Multi-Provider LLM Integration**:
  - Google Gemini (`gemini-flash-lite-latest`, etc.)
  - DeepSeek (`deepseek-chat`)
  - AgentRouter / OpenRouter (OpenAI-compatible endpoints: GPT-5.6, Claude, DeepSeek v4, etc.)
  - Per-guild custom API key, base URL, and model overrides supported via Web Dashboard.
- **Strict Security & Tool Whitelisting**:
  - The chatbot only receives tools explicitly enabled in the guild's `chatbot.allowedTools` list.
  - High-impact/risky tools (e.g., kick, rename voice, change nickname) are disabled by default.
- **Vision & Image Processing**:
  - Automatic image attachment inspection (`readImages`).
  - Pre-compression and dimension optimization via `sharp` (`compressImages`).
- **Per-Guild Long-Term Memory (`GuildMemory`)**:
  - Chatbot extracts memorable facts into a structured JSON contract (`"remember": [{ key, value }]`).
  - Saved in the database per guild; queried via `search_memory` tool or managed via the Web Dashboard.
- **Modular System Prompts**:
  - Prompt templates in `apps/api/src/modules/discord/chatbot/prompts/*.md` are loaded and combined alphabetically.

### 7. Unified Multi-Game Giftcode Engine
- **HoYoverse API Poller** (`michosgc`): Genshin Impact, Honkai: Star Rail, Honkai Impact 3rd, Zenless Zone Zero, Tears of Themis.
- **Scraper Crawler** (`giftcode-crawler`): Wuthering Waves, Neverness to Everness (NTE), Arknights, Endfield, Where Winds Meet.
- **Unified Dispatcher** (`giftcode`): Single notification pipeline per guild. Supports common role ping (`mode: 'common'`) or game-specific role ping (`mode: 'perGame'`).
- Hash-based caching prevents duplicate alerts across restarts.

### 8. Frontend Architecture (`apps/web`)
- Built with **React 19**, **Vite 7**, and **Tailwind CSS v4**.
- UI component primitives based on **shadcn/ui** and **Radix UI**.
- State management: **Zustand** for local client state, **TanStack Query v5** for server cache & mutations.
- Real-time updates via **Socket.IO client** (used in the interactive Music Web Player).
- Discord OAuth2 session with JWT authentication (`AuthGuard`).

---

## 🚀 Running & Developing the Project

### Development
```bash
# Run both API and Web concurrently
pnpm dev

# Run API with live web build watch
pnpm dev-b

# Run individual workspaces
pnpm dev:api
pnpm dev:web
```

### Database & Prisma
```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Launch Prisma Studio GUI
pnpm db:studio
```

### Building & Testing
```bash
# Build all workspaces (shared -> api -> web)
pnpm build

# Build shared package only
pnpm --filter shared build

# Run backend unit tests
pnpm --filter api test
```

### API Documentation
- Interactive Swagger UI: `http://localhost:3000/api/docs`

---

## 📋 Coding Conventions & Guidelines

1. **Strict TypeScript**: Never use `any` unless strictly required for third-party Discord RPC payloads where ESLint rules have been explicitly tuned.
2. **Prettier & Formatting**: Keep files formatted according to the project's Prettier configuration.
3. **No Code Edits via Shell Scripts**: Never use bash `cat`, `sed`, or `awk` to overwrite code files. Always use designated IDE editing tools (`replace_file_content`, `multi_replace_file_content`, `write_to_file`).
4. **Preserve Comments**: Maintain documentation integrity, existing docstrings, and comments unless explicitly directed to modify them.
5. **Environment Configuration**: Keep `.env.example` in sync whenever new configuration keys are introduced.
