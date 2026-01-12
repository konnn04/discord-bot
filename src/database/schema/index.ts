export * from './guilds';
export * from './guildSettings';
export * from './users';
export * from './userGuildStats';
export * from './botInfo';
export * from './apiClients';

// Export all schemas as one object for Drizzle
import { guilds } from './guilds';
import { guildSettings } from './guildSettings';
import { users } from './users';
import { userGuildStats } from './userGuildStats';
import { botInfo } from './botInfo';
import { apiClients } from './apiClients';

export const schema = {
  guilds,
  guildSettings,
  users,
  userGuildStats,
  botInfo,
  apiClients,
};