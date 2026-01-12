import { Guild } from 'discord.js';
import { GuildService } from '@services/GuildService';
import { GuildSettingsService } from '@services/GuildSettingsService';

export default {
  name: 'guildCreate',
  async execute(guild: Guild) {
    try {
        console.log(`[Guild] Joined new server: ${guild.name} (${guild.id})`);
        
        // Sync guild info to DB
        await GuildService.syncGuild(guild);
        
        // Create default settings if needed
        await GuildSettingsService.getOrCreate(guild.id);
        
        console.log(`[Guild] ✅ Initialized database for ${guild.name}`);
    } catch (error) {
        console.error(`[Guild] ❌ Failed to initialize database for new guild ${guild.name}:`, error);
    }
  },
};
