# FoxyBot — Backend API & Discord Bot (`apps/api`)

The backend service powering **FoxyBot**, built with [NestJS 11](https://nestjs.com/), [discord.js v14](https://discord.js.org/), and [Prisma ORM](https://www.prisma.io/) with PostgreSQL.

---

## 🏗️ Architecture & Modules

```
apps/api/
├── prisma/
│   └── schema.prisma         # Database models & PostgreSQL schema
└── src/
    ├── main.ts               # App bootstrap, Swagger OpenAPI setup, CORS
    ├── app.module.ts         # Root module
    └── modules/
        ├── auth/             # Discord OAuth2 login & JWT authentication
        ├── discord/          # Discord client, actions, chatbot, commands, events
        │   ├── actions/      # Presentation-agnostic business actions (Action Pattern)
        │   ├── chatbot/      # Multi-provider LLM chatbot, vision & memory service
        │   ├── commands/     # Dynamic slash command handlers
        │   ├── events/       # Gateway event listeners
        │   └── services/     # Music player, TTS, Voice tag, Event/Command loaders
        ├── giftcode/         # Unified giftcode notification service
        ├── giftcode-crawler/ # Web scraper for non-HoYoverse giftcodes
        ├── guilds/           # Server management & settings REST endpoints
        ├── meetings/         # Voice meeting tracking & public reports
        ├── michosgc/         # HoYoverse giftcode poller
        ├── presence/         # Lanyard-compatible public presence REST API
        ├── prisma/           # Prisma client service
        ├── settings/         # In-memory cached settings manager
        └── xp/               # XP batching buffer & leaderboard calculator
```

---

## ⚙️ Key Concepts

1. **Action Pattern**: Business logic is separated into pure actions under `src/modules/discord/actions/`. Each action receives `ActionContext` and returns `ActionResult<T>`. Both Slash Commands and AI Chatbot Tools execute these actions.
2. **Hybrid Settings Cache**: Server settings are stored as PostgreSQL `JSONB` but loaded into in-memory `Map` caches on startup for zero-latency lookups during Discord message and voice events.
3. **In-Memory XP Buffer**: `XpBufferService` collects voice & message XP in memory and flushes them to PostgreSQL via `$transaction` every 30 seconds.
4. **AI Chatbot**: Multi-LLM provider abstraction (Gemini, DeepSeek, AgentRouter), image analysis with `sharp` compression, tool calling whitelist per server, and per-guild `GuildMemory`.

---

## 🚀 Running the API

```bash
# From repository root:
pnpm dev:api

# Or inside apps/api:
pnpm start:dev
```

- **Swagger API Docs**: `http://localhost:3000/api/docs`
