# Discord Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Read this in other languages: [English](README.md), [Tiếng Việt](README.vi.md).*

A fully-featured, modular Discord bot built with **NestJS**, **Prisma (PostgreSQL)**, and a **React/Vite** dashboard interface. Designed as a monorepo using **pnpm workspaces**, ensuring excellent code-sharing and scalability.

## Features

- **Modular Architecture**: Built with NestJS, leveraging dependency injection for scalable backend logic.
- **Dynamic Command & Event Loading**: Automatically registers Discord slash commands and events at startup.
- **Rich Command Categories**:
  - 🎵 **Music** — Play, skip, pause, resume, queue, lyrics, recommendations, history. Multi-platform: YouTube & Spotify.
  - 🛡️ **Moderation** — Ban, kick, timeout, warn, purge messages, role management.
  - 📊 **XP & Leveling** — Tracks voice & text channel activity with auto-leveling, leaderboards, and rank cards.
  - 😄 **Emote / Anime** — Reaction GIFs (hug, pat, slap, kiss…) via nekos.best.
  - 📝 **Confession** — Anonymous confessions with approval workflow.
  - 🗓️ **Meeting** — Schedule and manage voice channel meetings.
  - 🕵️ **Stalk** — GitHub presence, LeetCode tracking, anime list (MyAnimeList).
  - ⚙️ **Settings** — Per-guild & global config with web dashboard sync.
  - 🎮 **Presence** — Public presence API (Lanyard-compatible) for portfolio display.
- **Robust Configuration System**: Stores global and per-guild settings in PostgreSQL (JSONB) with in-memory caching for zero-latency lookups.
- **Automated Notifications**: Configurable scheduled tasks via `@nestjs/schedule` (e.g., Hoyoverse giftcode auto-fetcher).
- **Web Dashboard**: An integrated React + Vite frontend application for easy administration and configuration.
- **Public Presence API**: A Lanyard-like API to display user Discord status seamlessly on personal portfolios.

## Monorepo Structure

```
discord-bot/
├── apps/
│   ├── api/       # NestJS backend & Discord bot logic
│   └── web/       # React (Vite) frontend dashboard
├── packages/
│   └── shared/    # Shared types, constants, and utilities
└── docker-compose.yml
```

## Prerequisites

- Node.js (v20 or newer)
- pnpm (v10)
- PostgreSQL
- Discord Bot Token

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/discord-bot.git
   cd discord-bot
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in `apps/api/`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/discord_bot?schema=public"
   DISCORD_TOKEN="your-discord-bot-token"
   ```

4. **Initialize Database:**
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma db push
   ```

## Running the Application

### Development
Start the application in development mode (spins up both API and Web):
```bash
pnpm dev
```

### Production (Docker)
We provide a `docker-compose.yml` to easily deploy the entire stack:
```bash
docker-compose up -d --build
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Third-Party APIs & Credits

This project relies on the following excellent community APIs and tools:
- [nekos.best](https://nekos.best/) — Anime-style GIF reactions (hug, pat, slap, etc.).
- [hoyo-codes](https://docs.hb.seria.moe/) by Seria — Latest Hoyoverse giftcodes for the automated tracker.
- [discord.js](https://discord.js.org/) / [@discordjs/voice](https://github.com/discordjs/voice) — Discord gateway & voice streaming.
- Custom Music Server — Self-hosted music API for YouTube/Spotify search, resolve, and audio streaming.
- [LRCLIB](https://lrclib.net/) — Synced lyrics database.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
