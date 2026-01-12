import { Guild } from 'discord.js';
import { GuildService } from '@services/GuildService';

export default {
  name: 'guildDelete',
  async execute(guild: Guild) {
    console.log(`[Guild] Left server: ${guild.name} (${guild.id})`);
    
    // Mark guild as inactive
    await GuildService.deactivate(guild.id);
    
    console.log(`[Guild] ❌ Deactivated database records for ${guild.name}`);
  },
};
