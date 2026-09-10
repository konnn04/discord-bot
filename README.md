# FoxyBot — Discord Bot & Web Dashboard

<div align="center">
  <p><strong>A feature-rich, modular Discord bot and real-time Web Dashboard built with NestJS, React 19, Vite, and Prisma (PostgreSQL).</strong></p>
  <p>
    <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/NestJS-11.x-E0234E?logo=nestjs&logoColor=white" alt="NestJS" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black" alt="React" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-v4.x-38B2AC?logo=tailwind-css&logoColor=white" alt="TailwindCSS" /></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma&logoColor=white" alt="Prisma" /></a>
    <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-14.x-5865F2?logo=discord&logoColor=white" alt="Discord.js" /></a>
    <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" /></a>
  </p>
  <p>
    <a href="README.md"><strong>English</strong></a> •
    <a href="README.vi.md"><strong>Tiếng Việt</strong></a> •
    <a href="PROJECT_PROMPT.md"><strong>Project Prompt</strong></a> •
    <a href="CLAUDE.md"><strong>Architecture Guide</strong></a>
  </p>
</div>

---

## 📖 Overview

**FoxyBot** is an enterprise-grade Discord bot ecosystem organized as a clean **pnpm monorepo**. It pairs a high-throughput **NestJS 11** backend with an intuitive **React 19 + Vite 7** administrative dashboard. 

The bot is designed around a presentation-agnostic **Action Pattern**, allowing business logic (music playback, server moderation, giftcode lookups, memory search) to be executed interchangeably by **Discord Slash Commands**, **AI Chatbot Function Calls**, or the **Web Dashboard REST API**.

---

## ✨ Key Features

### 🤖 1. AI Chatbot with Vision & Long-Term Memory
- **Multi-Provider LLM Integration**: Connects to **Google Gemini**, **DeepSeek**, and **AgentRouter / OpenRouter** (supporting OpenAI-compatible models such as GPT-5.6, Claude 3.7, DeepSeek v4).
- **Secure Tool Calling**: Per-guild whitelist (`allowedTools`). The AI can autonomously play music, query server info, check giftcodes, search memory, or manage voice channels—only when authorized by administrators.
- **Vision Capabilities**: Automatically detects and processes attached images with pre-compression via `sharp` to conserve token usage.
- **Persistent Server Memory (`GuildMemory`)**: The chatbot extracts facts during natural conversations (`"remember": [...]`), persists them to PostgreSQL, and recalls them via the `search_memory` tool or the Web Dashboard.
- **Modular Prompt Engineering**: Markdown-based system prompts (`prompts/*.md`) concatenated dynamically at runtime.

### 🎁 2. Unified Multi-Game Giftcode Engine
- **Dual Retrieval Engine**:
  - **HoYoverse API** (`michosgc`): Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Honkai Impact 3rd, Tears of Themis.
  - **Web Scraper Crawler** (`giftcode-crawler`): Wuthering Waves, Neverness to Everness (NTE), Arknights, Endfield, Where Winds Meet.
- **Smart Role Notifications**: Configure notifications per guild with either a shared role tag (`common`) or dedicated role tags per game (`perGame`).
- **Deduplication**: Hash-based cache (`GiftcodeCache`) eliminates duplicate pings.

### 🎵 3. High-Fidelity Music & Voice Streaming
- **Multi-Source Playback**: Streams from YouTube and Spotify through a self-hosted custom music server.
- **Full Playback Controls**: Play, pause, resume, skip, queue reordering, loop modes, volume adjustments, and song removal.
- **Synced Lyrics & Recommendations**: Real-time lyrics fetching powered by [LRCLIB](https://lrclib.net/) and smart music recommendations based on listening history.
- **Text-to-Speech (TTS)**: Natural voice synthesis in voice channels powered by `edge-tts-universal`.
- **Interactive Web Player**: Real-time music controller on the Web Dashboard synchronized via **Socket.IO**.

### 📊 4. Leveling (XP) & Role Rank System
- **In-Memory Batching (`XpBufferService`)**: Accumulates voice and text XP in memory with anti-spam cooldowns, flushing to PostgreSQL via `$transaction` every 30 seconds for peak database performance.
- **Role Rank**: Automatically assigns non-stacking Discord roles when members hit configured level milestones.
- **Canvas Visuals**: High-performance backend image rendering for Rank Cards and Welcome Cards using `@napi-rs/canvas`.

### 🖥️ 5. Real-Time Web Dashboard (`apps/web`)
- Built with **React 19**, **Vite 7**, **Tailwind CSS v4**, and **shadcn/ui**.
- **Discord OAuth2 Authentication**: Secure JWT-based session management.
- **Server Overview & Member Directory**: Real-time analytics, online member graphs, and member management.
- **Visual Settings Studio**:
  - **Welcome & Leave Designer**: Live preview of Canvas cards, custom text placeholders, and Embed builders.
  - **Chatbot & Tool Studio**: Select LLM providers, enter custom API keys, customize models, and toggle tool permissions.
  - **Server Memory Manager**: Search, view, edit, and delete memories stored by the AI.
  - **Giftcode & Notification Hub**: Enable individual games and map ping roles.
  - **Role Rank Editor**: Configure level-to-role mapping rules with drag-and-drop ease.

### 📅 6. Meetings Tracking & Public Reports
- Track attendance for voice meetings with join/leave timelines.
- Generates beautiful public web reports accessible at `/meetings/:id`.

### 🌐 7. Social, Presence & Developer Tools
- **Public Presence API**: A Lanyard-compatible REST API allowing users to display their live Discord status, Spotify tracks, and activity on personal portfolio sites.
- **Stalker Activity Tracker**: Subscribe to member events (online, voice, games, messages) with complete privacy opt-out (`/optout`).
- **LeetCode & Anime Trackers**: Daily LeetCode challenges, contest reminders, and anime broadcast schedules with DM alerts.
- **Anonymous Confessions**: Safe confession channels with admin audit logs (`ConfessionLog`) for abuse prevention.

---

## 📁 Repository Structure

```
discord-bot/
├── apps/
│   ├── api/                      # NestJS 11 backend & Discord bot
│   │   ├── prisma/               # PostgreSQL schema & Prisma client
│   │   └── src/
│   │       ├── main.ts           # Server bootstrap & Swagger documentation
│   │       └── modules/
│   │           ├── auth/         # Discord OAuth2 & JWT authentication
│   │           ├── discord/      # Bot core: actions, chatbot, commands, events, music
│   │           ├── giftcode/     # Unified giftcode notification service
│   │           ├── giftcode-crawler/ # Scraper for non-HoYoverse games
│   │           ├── guilds/       # Guild REST API & settings endpoints
│   │           ├── meetings/     # Voice meeting session tracking & report API
│   │           ├── michosgc/     # HoYoverse giftcode poller
│   │           ├── presence/     # Lanyard-compatible public presence API
│   │           ├── prisma/       # Prisma database service
│   │           ├── settings/     # In-memory cached settings manager
│   │           └── xp/           # XP batching buffer & leaderboard calculator
│   └── web/                      # React 19 + Vite 7 admin dashboard
│       └── src/
│           ├── components/       # shadcn/ui components & layouts
│           ├── hooks/            # Data-fetching & state hooks
│           ├── pages/            # Admin, settings, music player, reports
│           └── routes/           # React Router 7 route definitions
├── packages/
│   └── shared/                   # Shared TypeScript types, schemas & constants
│       └── src/types/            # settings.types.ts, discord.types.ts, music.types.ts
├── Dockerfile                    # Multi-stage production container build
├── docker-compose.yml            # Full production stack (API, Web, Postgres, Redis)
└── .env.example                  # Environment configuration template
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v10.0.0` or higher
- **PostgreSQL**: `v14` or higher
- **Discord Bot Token**: Create an application at the [Discord Developer Portal](https://discord.com/developers/applications) with all Privileged Intents enabled (Message Content, Server Members, Presence).

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/yourusername/discord-bot.git
cd discord-bot
pnpm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```
Fill in the essential variables:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/discord_bot?schema=public"
DISCORD_TOKEN="your_discord_bot_token"
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_CLIENT_SECRET="your_discord_client_secret"
JWT_SECRET="your_random_jwt_secret"
GEMINI_API_KEY="your_gemini_api_key"
```

### 3. Initialize the Database
```bash
pnpm db:generate
pnpm db:push
```

### 4. Run the Project
```bash
# Start both Backend and Web Dashboard concurrently in dev mode
pnpm dev

# Or start individually:
pnpm dev:api   # Starts NestJS API & Discord Bot on http://localhost:3000
pnpm dev:web   # Starts Vite Dashboard on http://localhost:5173
```

- **Interactive Swagger Documentation**: Available at `http://localhost:3000/api/docs`
- **Web Dashboard**: Available at `http://localhost:5173`

---

## 🐳 Running with Docker

Deploy the complete stack (Backend, Frontend, PostgreSQL, Redis) with a single command:
```bash
docker-compose up -d --build
```

---

## 🎮 Slash Commands Overview

| Category | Key Commands | Description |
|---|---|---|
| **Common** | `/help`, `/ping`, `/avatar`, `/userinfo`, `/guildinfo`, `/qr`, `/remind` | Utility commands & server information |
| **Giftcode** | `/giftcode`, `/giftcode_other` | Tra cứu giftcode game HoYoverse & game khác |
| **Music** | `/play`, `/pause`, `/skip`, `/stop`, `/queue`, `/np`, `/lyrics`, `/recommend` | Full-featured music streaming |
| **TTS** | `/speak`, `/stop-speak` | Text-to-speech voice synthesis in voice channels |
| **XP & Leveling**| `/rank`, `/leaderboard` | View member card rank and guild leaderboards |
| **Emote** | `/e_hug`, `/e_pat`, `/e_kiss`, `/e_slap`, `/e_punch`, `/e_cry` | Anime reaction GIFs via nekos.best |
| **Meeting** | `/start-tracking`, `/end-tracking` | Record voice meetings and generate web reports |
| **Settings** | `/welcome_setting`, `/setting_rolerank`, `/setting_voicetag`, etc. | Per-guild configuration management |
| **Confession** | `/confess`, `/config_confession`, `/confession_logs` | Anonymous confession system with moderation |
| **Stalk** | `/stalk`, `/my_stalk`, `/optout` | User activity notifications with privacy controls |
| **Presence** | `/my_presence`, `/my_github`, `/my_leetcode` | Public portfolio presence settings |

---

## 📜 Credits & Third-Party APIs

- [discord.js](https://discord.js.org/) & [@discordjs/voice](https://github.com/discordjs/voice) — Discord API & voice streaming
- [Google Gemini API](https://ai.google.dev/) / [DeepSeek](https://deepseek.com/) / [OpenRouter](https://openrouter.ai/) — AI Chatbot LLMs
- [nekos.best](https://nekos.best/) — Anime-style reaction media
- [hoyo-codes](https://docs.hb.seria.moe/) by Seria — HoYoverse giftcode API
- [LRCLIB](https://lrclib.net/) — Synchronized lyrics database
- [Edge TTS](https://github.com/rany2/edge-tts) — High-quality text-to-speech audio

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
