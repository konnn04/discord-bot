import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { getPlayerManager } from '../services/music/player-manager';
import { getQueueManager } from '../services/music/queue-manager';
import { getMusicApi } from '../services/music/music-api.client';
import { DiscordService } from '../discord.service';

/**
 * REST API for future Web Dashboard remote control.
 */
@Controller('api/v1/discord/music')
export class MusicController {
  constructor(private readonly discordService: DiscordService) {}

  @Get('guilds/:guildId/state')
  getState(@Param('guildId') guildId: string) {
    const pm = getPlayerManager();
    const qm = getQueueManager();

    const isConnected = pm.isConnected(guildId);
    const isPlaying = pm.isPlaying(guildId);
    const isPaused = pm.isPaused(guildId);
    const volume = qm.getVolume(guildId);
    const current = qm.getCurrent(guildId);
    const elapsed = pm.getElapsed(guildId);

    // Get full queue for web UI
    const queueData = qm.getPage(guildId, 1); // just get first 10 for overview

    return {
      success: true,
      data: {
        isConnected,
        isPlaying,
        isPaused,
        volume,
        elapsed,
        current: current ? current.track : null,
        queueCount: queueData.total,
        upcoming: queueData.tracks.slice(1).map((t) => t.track),
      },
    };
  }

  @Post('guilds/:guildId/play')
  async play(
    @Param('guildId') guildId: string,
    @Body() body: { query: string; userId: string; username: string },
  ) {
    const { query, userId, username } = body;
    if (!query) return { success: false, message: 'Missing query' };

    const api = getMusicApi();
    const qm = getQueueManager();
    const pm = getPlayerManager();

    try {
      const result = await api.searchAndResolve(query);

      const wasEmpty = !qm.getCurrent(guildId) || !pm.isPlaying(guildId);

      // We need a text channel to send the "Now Playing" message to.
      // In a real scenario, the web dashboard might let you pick one,
      // but here we just try to find an existing one from the queue manager.
      let textChannelId = qm.get(guildId)?.textChannelId;
      if (!textChannelId) {
        // Fallback: try to find a suitable channel
        const guild = this.discordService.client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.find((c) => c.isTextBased());
        if (channel) textChannelId = channel.id;
      }

      if (!textChannelId) {
        return {
          success: false,
          message: 'No text channel found to send messages',
        };
      }

      qm.addTrack(guildId, textChannelId, {
        track: result.track,
        youtubeId: result.youtubeId,
        requestedBy: username || 'Web Dashboard',
        requestedById: userId || 'web',
      });

      if (wasEmpty) {
        const q = qm.get(guildId)!;
        q.current = q.tracks.length - 1;

        // Note: For web API, the bot must ALREADY be in a voice channel
        // or we need to pass the voice channel ID. If not connected, return error.
        if (!pm.isConnected(guildId)) {
          // Can't auto join without a voice channel ID
          return {
            success: false,
            message: 'Bot must be in a voice channel first',
          };
        }

        await pm.play(guildId, this.discordService.client);
      }

      return { success: true, message: 'Added to queue', track: result.track };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @Post('guilds/:guildId/action')
  async action(
    @Param('guildId') guildId: string,
    @Body() body: { action: 'pause' | 'resume' | 'skip' | 'stop' },
  ) {
    const pm = getPlayerManager();
    const qm = getQueueManager();

    if (!pm.isConnected(guildId)) {
      return { success: false, message: 'Not connected' };
    }

    switch (body.action) {
      case 'pause':
        pm.pause(guildId);
        break;
      case 'resume':
        pm.resume(guildId);
        break;
      case 'skip': {
        const next = qm.skip(guildId, 1);
        if (next) {
          await pm.play(guildId, this.discordService.client);
        } else {
          pm.stop(guildId);
        }
        break;
      }
      case 'stop':
        pm.stop(guildId);
        break;
      default:
        return { success: false, message: 'Invalid action' };
    }

    return { success: true, message: `Executed ${body.action}` };
  }

  @Put('guilds/:guildId/volume')
  setVolume(
    @Param('guildId') guildId: string,
    @Body() body: { level: number },
  ) {
    const pm = getPlayerManager();
    if (!pm.isConnected(guildId)) {
      return { success: false, message: 'Not connected' };
    }

    if (typeof body.level !== 'number') {
      return { success: false, message: 'Invalid volume level' };
    }

    pm.setVolume(guildId, body.level);
    return { success: true, message: `Volume set to ${body.level}` };
  }
}
