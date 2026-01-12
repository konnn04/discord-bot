import { BotClient } from '../types/bot.types';
import { GuildService } from '@services/GuildService';
import { GuildSettingsService } from '@services/GuildSettingsService';
import { BotInfoService } from '@services/BotInfoService';

export default {
  name: 'clientReady',
  once: true,
  async execute(client: BotClient) {
    console.log(`[SUCCESS] Logged in as ${client.user?.tag}`);

    // Sync all guilds
    console.log('[Guild] Syncing guilds to database...');
    const guilds = client.guilds.cache;
    const activeGuildIds: string[] = [];
    let syncedCount = 0;

    for (const [_, guild] of guilds) {
      try {
        await GuildService.syncGuild(guild);
        await GuildSettingsService.getOrCreate(guild.id);
        activeGuildIds.push(guild.id);
        syncedCount++;
      } catch (error) {
        console.error(`[Guild] Failed to sync guild ${guild.name} (${guild.id}):`, error);
      }
    }
    
    if (activeGuildIds.length > 0) {
      await GuildService.deactivateMissing(activeGuildIds);
    }

    console.log(`[Guild] Synced ${syncedCount}/${guilds.size} guilds.`);

    // Set RPC Status
    try {
      const statusData = await BotInfoService.getRpcStatus();
      client.rpc.setText(statusData.text, statusData.status as any).catch(console.error);
      client.rpc.setStatus(statusData.status as any).catch(console.error);

    } catch (err) {
      console.error('[RPC] Failed to load status from DB:', err);
      client.rpc.setText('Database Error', 'dnd').catch(console.error);
    }
  },
};