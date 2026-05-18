import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TextChannel } from 'discord.js';
import { getPlayerManager } from '../services/music/player-manager';
import { getQueueManager } from '../services/music/queue-manager';
import { getMusicApi } from '../services/music/music-api.client';
import { DiscordService } from '../discord.service';
import { MusicGateway } from '../gateways/music.gateway';

async function sendWebLog(
  discordService: DiscordService,
  guildId: string,
  username: string,
  action: string,
) {
  try {
    const qm = getQueueManager();
    const textChannelId = qm.get(guildId)?.textChannelId;
    if (!textChannelId) return;
    const ch = await discordService.client.channels.fetch(textChannelId);
    // Voice channels in Discord now support .send() for text chat
    if (ch && 'send' in ch) {
      await (ch as TextChannel).send(
        `📟 **[Dashboard Web]** **${username || 'Unknown'}** vừa ${action}`,
      );
    }
  } catch {
    /* ignore — logging shouldn't break the API */
  }
}

function uname(body: any): string {
  return body?.username || 'Unknown';
}

/**
 * REST API for Web Dashboard music remote control.
 */
@Controller('v1/discord/music')
export class MusicController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly gateway: MusicGateway,
  ) {}

  @Get('guilds/:guildId/voice-status')
  getVoiceStatus(@Param('guildId') guildId: string) {
    const pm = getPlayerManager();
    const connected = pm.isConnected(guildId);
    let voiceChannelId: string | null = null;
    let voiceChannelName: string | null = null;
    if (connected) {
      const gp = pm.getGuildPlayer(guildId);
      if (gp) {
        voiceChannelId = gp.connection.joinConfig.channelId ?? null;
        try {
          const ch = gp.client?.channels.cache.get(voiceChannelId ?? '');
          if (ch && 'name' in ch) voiceChannelName = (ch as any).name;
        } catch {
          /* ignore */
        }
      }
    }
    return {
      success: true,
      data: { connected, voiceChannelId, voiceChannelName },
    };
  }

  @Post('guilds/:guildId/join')
  async joinVoice(
    @Param('guildId') guildId: string,
    @Body() body: { userId?: string; username?: string },
  ) {
    const pm = getPlayerManager();
    if (pm.isConnected(guildId)) {
      return {
        success: true,
        message: 'Bot is already in a voice channel',
      };
    }

    // Find the user's voice channel
    const guild = this.discordService.client.guilds.cache.get(guildId);
    if (!guild) {
      return { success: false, message: 'Guild not found' };
    }

    let voiceChannel: any = null;
    try {
      if (body.userId) {
        const member = await guild.members.fetch(body.userId);
        voiceChannel = member?.voice?.channel;
      }
    } catch {
      /* member not found or not cached */
    }

    if (!voiceChannel) {
      voiceChannel = guild.channels.cache.find(
        (c) => c.isVoiceBased() && (c as any).members?.size > 0,
      );
    }

    if (!voiceChannel) {
      return {
        success: false,
        message:
          'Bạn chưa tham gia kênh voice nào. Hãy vào kênh voice trước rồi thử lại.',
      };
    }

    try {
      pm.join(voiceChannel);
      void sendWebLog(
        this.discordService,
        guildId,
        uname(body),
        `gọi bot vào kênh **${voiceChannel.name || 'voice'}**`,
      );
      this.gateway.broadcastState(guildId);

      return {
        success: true,
        message: `Đã vào kênh ${voiceChannel.name || 'voice'}`,
        data: {
          voiceChannelId: voiceChannel.id,
          voiceChannelName: voiceChannel.name || null,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Không thể kết nối' };
    }
  }

  @Get('guilds/:guildId/state')
  getState(@Param('guildId') guildId: string) {
    return { success: true, data: this.gateway.getMusicState(guildId) };
  }

  @Get('guilds/:guildId/queue')
  getQueue(@Param('guildId') guildId: string) {
    const qm = getQueueManager();
    const queueData = qm.getPage(guildId, 1);
    const allTracks = queueData.tracks.map((t) => ({
      ...t.track,
      requestedBy: t.requestedBy,
    }));

    return {
      success: true,
      data: {
        queue: allTracks.slice(queueData.currentIndex + 1),
        history: allTracks.slice(0, queueData.currentIndex),
      },
    };
  }

  @Get('guilds/:guildId/search')
  async search(
    @Param('guildId') _guildId: string,
    @Query('q') query: string,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    if (!query) return { success: false, message: 'Missing query' };
    const api = getMusicApi();
    const src = source === 'youtube' || source === 'spotify' ? source : 'all';
    const lim = Math.min(parseInt(limit || '20', 10) || 20, 50);
    const pg = Math.max(parseInt(page || '1', 10) || 1, 1);
    try {
      const result = await api.search(query, src, lim);
      const total = result.length;
      // Client-side paginate since the music API doesn't support offset
      const start = (pg - 1) * lim;
      const pageItems = result.slice(start, start + lim);
      return {
        success: true,
        data: {
          tracks: pageItems,
          page: pg,
          totalPages: Math.ceil(total / lim),
          total,
          source: src,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @Get('guilds/:guildId/lyrics')
  async getLyrics(
    @Param('guildId') guildId: string,
    @Query('track') track?: string,
    @Query('artist') artist?: string,
  ) {
    // If no track/artist provided, use currently playing
    let t = track;
    let a = artist;
    if (!t) {
      const qm = getQueueManager();
      const current = qm.getCurrent(guildId);
      if (!current)
        return {
          success: false,
          message: 'No track playing and no track query',
        };
      t = current.track.title;
      a = current.track.artist;
    }
    const api = getMusicApi();
    try {
      const result = await api.getLyrics(t, a || '');
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @Post('guilds/:guildId/play')
  async play(
    @Param('guildId') guildId: string,
    @Body() body: { query: string; userId?: string; username?: string },
  ) {
    const { query, userId, username } = body;
    if (!query) return { success: false, message: 'Missing query' };

    const api = getMusicApi();
    const qm = getQueueManager();
    const pm = getPlayerManager();

    try {
      const result = await api.searchAndResolve(query);
      const wasEmpty = !qm.getCurrent(guildId) || !pm.isPlaying(guildId);

      let textChannelId = qm.get(guildId)?.textChannelId;
      if (!textChannelId) {
        if (pm.isConnected(guildId)) {
          const gp = pm.getGuildPlayer(guildId);
          const vcId = gp?.connection.joinConfig.channelId;
          if (vcId) textChannelId = vcId;
        }
        if (!textChannelId) {
          const guild = this.discordService.client.guilds.cache.get(guildId);
          const channel = guild?.channels.cache.find((c) => c.isTextBased());
          if (channel) textChannelId = channel.id;
        }
      }

      if (!textChannelId) {
        return { success: false, message: 'No text channel found' };
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
        if (!pm.isConnected(guildId)) {
          return {
            success: false,
            message: 'Bot must be in a voice channel first',
          };
        }
        await pm.play(guildId, this.discordService.client);
      }

      // Sync: update now-playing embed, broadcast, and log
      await pm.updateNowPlaying(guildId);
      this.gateway.broadcastState(guildId);
      const label = wasEmpty
        ? `phát: **${result.track.title}**`
        : `thêm vào queue: **${result.track.title}**`;
      void sendWebLog(this.discordService, guildId, uname(body), label);

      return { success: true, message: 'Added to queue', track: result.track };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @Post('guilds/:guildId/pause')
  async pause(
    @Param('guildId') guildId: string,
    @Body() body?: { username?: string },
  ) {
    const pm = getPlayerManager();
    if (!pm.isConnected(guildId))
      return { success: false, message: 'Not connected' };
    pm.pause(guildId);
    await pm.updateNowPlaying(guildId);
    this.gateway.broadcastState(guildId);
    void sendWebLog(this.discordService, guildId, uname(body), 'tạm dừng nhạc');
    return { success: true };
  }

  @Post('guilds/:guildId/resume')
  async resume(
    @Param('guildId') guildId: string,
    @Body() body?: { username?: string },
  ) {
    const pm = getPlayerManager();
    if (!pm.isConnected(guildId))
      return { success: false, message: 'Not connected' };
    pm.resume(guildId);
    await pm.updateNowPlaying(guildId);
    this.gateway.broadcastState(guildId);
    void sendWebLog(this.discordService, guildId, uname(body), 'tiếp tục phát');
    return { success: true };
  }

  @Post('guilds/:guildId/skip')
  async skip(
    @Param('guildId') guildId: string,
    @Body() body?: { username?: string },
  ) {
    const pm = getPlayerManager();
    const qm = getQueueManager();
    if (!pm.isConnected(guildId))
      return { success: false, message: 'Not connected' };
    const current = qm.getCurrent(guildId);
    const currentTitle = current?.track.title || '';
    const next = qm.skip(guildId, 1);
    if (next) {
      await pm.play(guildId, this.discordService.client);
      void sendWebLog(
        this.discordService,
        guildId,
        uname(body),
        `bỏ qua **${currentTitle}** → **${next.track.title}**`,
      );
    } else {
      pm.stop(guildId);
      void sendWebLog(
        this.discordService,
        guildId,
        uname(body),
        'bỏ qua, hết queue',
      );
    }
    await pm.updateNowPlaying(guildId);
    this.gateway.broadcastState(guildId);
    return { success: true };
  }

  @Post('guilds/:guildId/prev')
  async prev(
    @Param('guildId') guildId: string,
    @Body() body?: { username?: string },
  ) {
    const pm = getPlayerManager();
    const qm = getQueueManager();
    if (!pm.isConnected(guildId))
      return { success: false, message: 'Not connected' };
    const prevTrack = qm.prev(guildId);
    if (prevTrack) {
      await pm.play(guildId, this.discordService.client);
      void sendWebLog(
        this.discordService,
        guildId,
        uname(body),
        `quay lại **${prevTrack.track.title}**`,
      );
    }
    await pm.updateNowPlaying(guildId);
    this.gateway.broadcastState(guildId);
    return { success: true };
  }

  @Post('guilds/:guildId/loop')
  toggleLoop(
    @Param('guildId') guildId: string,
    @Body() body?: { username?: string },
  ) {
    const qm = getQueueManager();
    const current = qm.get(guildId)?.loopMode ?? 'off';
    const next =
      current === 'off' ? 'queue' : current === 'queue' ? 'track' : 'off';
    qm.setLoopMode(guildId, next);

    const labels: Record<string, string> = {
      track: 'bật lặp 1 bài',
      queue: 'bật lặp danh sách',
      off: 'tắt lặp',
    };
    void sendWebLog(this.discordService, guildId, uname(body), labels[next]);
    this.gateway.broadcastState(guildId);

    return { success: true, data: { loop: next } };
  }

  @Post('guilds/:guildId/shuffle')
  shuffle(
    @Param('guildId') guildId: string,
    @Body() body?: { username?: string },
  ) {
    const qm = getQueueManager();
    qm.shuffle(guildId);
    void sendWebLog(
      this.discordService,
      guildId,
      uname(body),
      'trộn danh sách phát',
    );
    this.gateway.broadcastState(guildId);
    return { success: true };
  }

  @Post('guilds/:guildId/seek')
  seek(
    @Param('guildId') guildId: string,
    @Body() body: { position: number; username?: string },
  ) {
    const pm = getPlayerManager();
    if (!pm.isConnected(guildId))
      return { success: false, message: 'Not connected' };
    if (typeof body.position !== 'number')
      return { success: false, message: 'Invalid position' };
    pm.seek(guildId, body.position);
    this.gateway.broadcastState(guildId);
    return { success: true };
  }

  @Put('guilds/:guildId/volume')
  setVolume(
    @Param('guildId') guildId: string,
    @Body() body: { volume: number; username?: string },
  ) {
    const pm = getPlayerManager();
    if (!pm.isConnected(guildId))
      return { success: false, message: 'Not connected' };
    if (typeof body.volume !== 'number')
      return { success: false, message: 'Invalid volume' };
    pm.setVolume(guildId, body.volume);
    void sendWebLog(
      this.discordService,
      guildId,
      uname(body),
      `chỉnh âm lượng: **${body.volume}%**`,
    );
    this.gateway.broadcastState(guildId);
    return { success: true };
  }

  @Delete('guilds/:guildId/queue/:trackId')
  removeFromQueue(
    @Param('guildId') guildId: string,
    @Param('trackId') trackId: string,
    @Body() body?: { username?: string },
  ) {
    const qm = getQueueManager();
    const q = qm.get(guildId);
    if (!q) return { success: false, message: 'No queue' };

    const idx = q.tracks.findIndex((t) => t.track.id === trackId);
    if (idx === -1) return { success: false, message: 'Track not found' };
    if (idx <= q.current)
      return { success: false, message: 'Cannot remove current or past track' };

    const removedTitle = q.tracks[idx].track.title;
    const position = idx - q.current;
    qm.removeTrack(guildId, position);

    void sendWebLog(
      this.discordService,
      guildId,
      uname(body),
      `xóa khỏi queue: **${removedTitle}**`,
    );
    this.gateway.broadcastState(guildId);
    return { success: true };
  }
}
