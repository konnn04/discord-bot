# FoxyBot - Discord bot Architecture & AI Instructions

Welcome to the **FoxyBot** repository. This is a monorepo managed by `pnpm workspaces`.
Please follow these core architectural rules when generating code or navigating the project.

## 🏗️ Repository Structure

- `apps/api/`: NestJS backend and Discord bot logic.
- `apps/web/`: React frontend (Vite) - Dashboard.
- `packages/shared/`: Shared code between API and Web. **Always place shared types, interfaces, and constants here.**

## 💡 Core Principles

### 1. Types & Shared Logic
- If a type is used by both the backend (NestJS) and frontend (React), it **MUST** go into `packages/shared/src/types`.
- Never duplicate types across `apps/api` and `apps/web`. Import them from the `shared` alias (e.g. `import type { ... } from 'shared/src/types/...'`).

### 2. Database & Prisma
- Prisma ORM is strictly contained within the `apps/api` package.
- The schema is located at `apps/api/prisma/schema.prisma`.
- We use PostgreSQL.
- Configuration settings (Global & Guild) are stored as `JSONB` in the database, NOT as local files.

### 3. Backend Architecture (NestJS)
- **Settings System**: Uses a hybrid approach. It persists to PostgreSQL (`GuildSettings`, `GlobalSettings`) but caches in-memory (`Map`) inside the NestJS services (`GuildSettingsService`, `GlobalSettingsService`) for extremely fast 0-latency reads during Discord events.
- **Discord Bot**:
  - Powered by `discord.js`.
  - Commands and Events are dynamically loaded using `CommandLoaderService` and `EventLoaderService`.
  - Commands are stored in `apps/api/src/modules/discord/commands/`.
  - Events are stored in `apps/api/src/modules/discord/events/`.
- **XP System**:
  - High-performance memory batching: `XpBufferService` collects XP from messages and voice states into memory, then flushes them to the DB using Prisma `$transaction` every 30 seconds.
  - XP logs are tracked per month and year in the `GuildMemberXp` model for leaderboards.

### 4. Code Style & Linting
- **TypeScript Strict Mode**: The project enforces strict TypeScript.
- **Prettier**: Ensure formatting is run before saving.
- For ESLint: `@typescript-eslint/no-redundant-type-constituents` is disabled to allow flexible union types with `any` in Discord RPC payloads.

## 🚀 Running the Project

- **Root Development**: `pnpm dev` (Runs concurrently: `pnpm dev:api` and `pnpm dev:web`).
- **Database Push**: `cd apps/api && npx prisma db push --accept-data-loss && npx prisma generate`
- **Swagger UI**: The API documentation is available at `http://localhost:3000/api/docs`.

---
*Note: Always use specific tool methods (like `replace_file_content` or `multi_replace_file_content`) to edit files. Never use `cat`/`sed` via bash.*
