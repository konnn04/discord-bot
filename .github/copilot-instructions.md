# GitHub Copilot Instructions - Discord Bot MPC

## Project Overview
TypeScript-based Discord bot (v14.25.1) with integrated Fastify REST API, PostgreSQL database (Drizzle ORM), and meeting/attendance tracking features. Uses ES Modules (`"type": "module"`).

## Architecture Fundamentals

### Command System - Dual Execution Model
Commands use **ActionCommand** interface supporting both slash commands and prefix commands:
- **actionCommands** Collection: Stores executable command logic
- **slashCommands** Collection: Stores SlashCommandBuilder instances for Discord API registration
- Commands live in `src/bot/commands/actions/{category}/{name}.action.ts`
- Use `formatSlashCommand()` from `src/bot/utils/commandBuilder.ts` to convert ActionCommand → SlashCommandBuilder

**Key Pattern:**
```typescript
export default {
  name: 'commandname',
  description: 'Brief description',
  cooldown: 3000, // optional ms
  isOnlySlashCommand: false, // true = disable prefix execution
  optionalArgs: [/* OptionCommand[] */],
  execute: async (ctx: ContextAdapter, args) => {
    // ctx unifies Message and Interaction APIs
  }
} satisfies ActionCommand;
```

### Context Adapter - Unified Command Interface
**ContextAdapter** (`src/bot/contexts/ContextAdapter.ts`) abstracts Message vs Interaction:
- **BaseContext**: Abstract class with common interface
- **InteractionContext**: Wraps ChatInputCommandInteraction/Button/SelectMenu
- **MessageContext**: Wraps Message (prefix commands)
- Factory: `createContext(source)` auto-detects type
- All commands receive `ContextAdapter` for consistent `.reply()`, `.defer()`, `.getOption()`

### ES Module Requirements
- Use `fileURLToPath(import.meta.url)` for `__dirname`:
  ```typescript
  import { fileURLToPath } from 'url';
  import { dirname } from 'path';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  ```
- All imports use file extensions: `.ts` for source, `.js` for compiled

### TypeScript Path Aliases
```typescript
@src/*      → ./src/*
@bot/*      → ./src/bot/*
@api/*      → ./src/api/*
@services/* → ./src/services/*
@shared/*   → ./src/shared/*
@config/*   → ./src/config/*
```

### Database Patterns
- **Drizzle ORM**: Import `db` from `src/database/client.ts`
- **Services Layer**: All DB access through services in `src/services/`
- **Schema**: Defined in `src/database/schema/`, exported via `src/database/schema/index.ts`
- **Foreign Keys**: Guild records must exist before guild_settings (use `GuildService.getOrCreate()`)

**Service Pattern:**
```typescript
export class ExampleService {
  static async get(id: string): Promise<Type | null> { /* query */ }
  static async getOrCreate(data: DiscordObject): Promise<Type> { /* ensure exists */ }
  static async create(data: NewType): Promise<Type> { /* insert */ }
  static async update(id: string, data: Partial<Type>): Promise<Type> { /* update */ }
}
```

### BotClient Extensions
`BotClient` interface (`src/bot/types/bot.types.ts`) extends Discord.js Client:
```typescript
export interface BotClient extends Client {
  rpc: RPC;
  actionCommands: Collection<string, ActionCommand>;
  slashCommands: Collection<string, SlashCommandBuilder>;
  cooldowns: Collection<string, Collection<string, number>>;
  meetingTracker: MeetingTracker;
  db: any;
}
```

### Event Handlers
Event files in `src/bot/events/` export:
```typescript
export default {
  name: 'eventName', // Discord.js event name
  once?: boolean,    // optional, for one-time events
  async execute(...args) { /* handler */ }
};
```
Auto-loaded by `loadEvents()` in `src/bot/events/index.ts`.

## Critical Workflows

### Development
- **Start bot**: `npm run dev` (tsx watch mode)
- **Deploy commands**: `npm run deploy-commands` (registers to Discord API)
- **Database migrations**: `npm run db:generate`, `npm run db:migrate`
- **Build**: `npm run build` (outputs to `dist/`)

### Adding New Commands
1. Create `src/bot/commands/actions/{category}/{name}.action.ts`
2. Export ActionCommand with `execute: async (ctx: ContextAdapter, args) => {}`
3. Restart bot (auto-loads, no manual registration needed)

### Discord.js v14 Type Safety
- **Flags**: Use `ephemeral: true` in reply options, NOT `MessageFlags.Ephemeral`
- **Channel Types**: Use `ChannelType` enum from discord.js for type guards
- **Collections**: Import from discord.js, not @discordjs/collection

### Internationalization (i18n)
- **I18nService** (`src/services/I18nService.ts`): Supports guild-specific localization
- Pattern: `await I18nService.t(guildId, 'key.path', { vars })`
- Translations in `src/locales/{lang}.json`

### Cooldown System
Implemented in `interactionCreate.ts` and `messageCreate.ts`:
- Per-command cooldowns stored in `client.cooldowns`
- Default: `appConfig.discord.cooldown` (3000ms)
- Override per-command: Set `cooldown` property in ActionCommand

## Project-Specific Conventions

### Naming
- **Commands**: `{name}.action.ts` (e.g., `ping.action.ts`)
- **Events**: `{eventName}.ts` (e.g., `messageCreate.ts`)
- **Services**: `{Name}Service.ts` (PascalCase)
- **Types**: `{name}.types.ts`

### Error Handling
- Log errors with `[ERROR]` prefix: `console.error('[ERROR] Context:', error)`
- Graceful degradation: Catch reply errors with `.catch(() => {})`
- Database errors: Wrap in try-catch, log before re-throwing

### Config Management
- **Environment**: `src/config/env.ts` (dotenv loader)
- **App Config**: `src/config/app.ts` (default prefix, cooldowns, bot name)
- Default prefix: `f!` (configurable per-guild via guild_settings)

### Manager Pattern for Features
Complex features use Manager classes (e.g., `MeetingTracker`, `AttendanceManager`):
- Store in `src/bot/utils/`
- Instantiate in `src/bot/index.ts` as BotClient property
- Use Collection or Map for in-memory session storage

## Integration Points

### Bot ↔ API Communication
- Fastify app receives `bot: BotClient` via decorator
- API routes access bot state: `app.bot.guilds.cache`
- WebSocket: `fastify-socket.io` plugin for real-time updates

### Database ↔ Discord Sync
- **guildCreate** event: Auto-creates guild record on join
- **guildDelete** event: Marks guild as inactive (soft delete)
- **messageCreate** event: Ensures guild exists before fetching settings

### Command Builder Validation
`formatSlashCommand()` enforces Discord API constraints:
- Command names: 1-32 chars, lowercase, alphanumeric + `-_`
- Descriptions: 1-100 chars
- Auto-maps channel type IDs to `ChannelType` enum
- Validates choice values, autocomplete compatibility

## Common Pitfalls

1. **Foreign Key Constraints**: Always use `GuildService.getOrCreate(guild)` before `GuildSettingsService.getOrCreate(guild)` 
2. **ES Modules**: Don't use `require()` or forget `import.meta.url` for file paths
3. **Command Registration**: Changes to command structure require `npm run deploy-commands`
4. **Type Guards**: Check `interaction.guild` exists before accessing guild-specific data
5. **ContextAdapter**: Commands must accept `ContextAdapter`, not raw Message/Interaction

## Testing & Debugging
- Bot logs prefixed: `[SUCCESS]`, `[INFO]`, `[WARN]`, `[ERROR]`
- Database connection: Listen for `[DB] Connected to PostgreSQL`
- Command loading: Shows count in `[SUCCESS] Loaded X commands (Y slash commands)`
- Use `npm run db:studio` for visual database exploration (Drizzle Studio)
