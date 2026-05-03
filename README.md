# Discord Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Read this in other languages: [English](README.md), [Tiếng Việt](README.vi.md).*

A fully-featured, modular Discord bot built with **NestJS**, **Prisma (PostgreSQL)**, and a **React/Vite** dashboard interface. Designed as a monorepo using **pnpm workspaces**, ensuring excellent code-sharing and scalability.

## Features

- **Modular Architecture**: Built with NestJS, leveraging dependency injection for scalable backend logic.
- **Dynamic Command & Event Loading**: Automatically registers Discord commands and events.
- **Robust Configuration System**: Stores global and per-guild settings in PostgreSQL (JSONB) with in-memory caching for zero-latency lookups.
- **Leveling & XP System**: Tracks user activity in voice and text channels with automatic leveling and leaderboards.
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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
