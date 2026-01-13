import { Guild } from 'discord.js';
import { GuildService } from '@services/GuildService';

export default {
  name: 'guildDelete',
  async execute(guild: Guild) {
    console.log(`[Guild][guildDelete] 🚀 EVENT TRIGGERED for: ${guild.name} (${guild.id})`);
    try {
        console.log(`[Guild] Left server: ${guild.name} (${guild.id})`);
        
        await GuildService.deactivate(guild.id);
        
        console.log(`[Guild] ❌ Deactivated database records for ${guild.name}`);
    } catch (error) {
        console.error(`[Guild] Failed to deactivate guild ${guild.name}:`, error);
    }
  },
};
