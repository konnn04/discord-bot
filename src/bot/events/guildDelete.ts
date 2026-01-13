import { Guild } from 'discord.js';
import { GuildService } from '@services/GuildService';

export default {
  name: 'guildDelete',
  async execute(guild: Guild) {
    try {
        console.log(`[Guild] Left server: ${guild.name} (${guild.id})`);
        
        // Mark guild as inactive
        await GuildService.deactivate(guild.id);
        
        console.log(`[Guild] ❌ Deactivated database records for ${guild.name}`);
    } catch (error) {
        console.error(`[Guild] Failed to deactivate guild ${guild.name}:`, error);
    }
  },
};
