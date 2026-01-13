import { Guild } from 'discord.js';
import { GuildService } from '@services/GuildService';
import { GuildSettingsService } from '@services/GuildSettingsService';

export default {
  name: 'guildCreate',
  async execute(guild: Guild) {
    console.log(`[Guild][guildCreate] 🚀 EVENT TRIGGERED for: ${guild.name} (${guild.id})`);
    try {
        console.log(`[Guild] Joined new server: ${guild.name} (${guild.id})`);
        
        await GuildService.syncGuild(guild);
        
        await GuildSettingsService.getOrCreate(guild.id);
        
        console.log(`[Guild] ✅ Initialized database for ${guild.name}`);
    } catch (error) {
        console.error(`[Guild] ❌ Failed to initialize database for new guild ${guild.name}:`, error);
    }
  },
};
