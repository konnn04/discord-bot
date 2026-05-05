import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { getMusicApi } from '../../services/music/music-api.client';
import {
  getQueueManager,
  type QueueTrack,
} from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { formatDuration, isUrl } from '../../services/music/utils';

const play: ActionCommand = {
  name: 'play',
  description: 'Phát nhạc từ URL hoặc tìm kiếm theo từ khóa',
  category: 'music',
  optionalArgs: [
    {
      name: 'query',
      description: 'Link YouTube/Spotify hoặc từ khóa tìm kiếm',
      type: 'STRING',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const query = ctx.getOption('query', 'string') as string;
    if (!query) {
      await ctx.reply('❌ Vui lòng nhập link hoặc từ khóa tìm kiếm.');
      return;
    }

    const voiceChannel = ctx.voiceChannel;
    if (!voiceChannel) {
      await ctx.reply('❌ Bạn cần vào một kênh thoại trước!');
      return;
    }

    await ctx.defer();

    const api = getMusicApi();
    if (!api.isConfigured()) {
      await ctx.editReply('❌ Music server chưa được cấu hình.');
      return;
    }

    const qm = getQueueManager();
    const pm = getPlayerManager();
    const guildId = ctx.guildId!;
    const textChannelId = ctx.channelId!;

    try {
      const tracksToAdd: QueueTrack[] = [];
      let totalAddedCount = 0;

      if (isUrl(query)) {
        // Parse URL
        const parsed = await api.parseUrl(query);

        if (parsed.type === 'track') {
          const trackData = parsed.data as any;
          let youtubeId = '';

          if (trackData.source === 'youtube') {
            youtubeId = trackData.sourceId;
          } else if (trackData.source === 'spotify') {
            // Resolve Spotify → YouTube
            const resolved = await api.resolve(trackData.sourceId);
            youtubeId = resolved.youtube.sourceId;
          }

          tracksToAdd.push({
            track: trackData,
            youtubeId,
            requestedBy: ctx.author.username,
            requestedById: ctx.userId,
          });
          totalAddedCount = 1;
        } else if (parsed.type === 'playlist' || parsed.type === 'album') {
          // Could be array of tracks or object with .tracks
          const items = Array.isArray(parsed.data)
            ? parsed.data
            : (parsed.data as any).tracks || [];

          if (items.length === 0) {
            await ctx.editReply(
              '❌ Playlist trống hoặc không tìm thấy bài hát.',
            );
            return;
          }

          const limited = items.slice(0, 50);

          for (const item of limited) {
            tracksToAdd.push({
              track: item,
              youtubeId: item.source === 'youtube' ? item.sourceId : undefined,
              requestedBy: ctx.author.username,
              requestedById: ctx.userId,
            });
          }

          if (tracksToAdd.length === 0) {
            await ctx.editReply('❌ Không có bài hát nào để thêm.');
            return;
          }

          totalAddedCount = tracksToAdd.length;
        }
      } else {
        // Search by keyword
        const result = await api.searchAndResolve(query);
        tracksToAdd.push({
          track: result.track,
          youtubeId: result.youtubeId,
          requestedBy: ctx.author.username,
          requestedById: ctx.userId,
        });
        totalAddedCount = 1;
      }

      if (tracksToAdd.length === 0) {
        await ctx.editReply('❌ Không tìm thấy bài hát nào.');
        return;
      }

      // Check if we need to start playing or just add to queue
      const wasEmpty = !qm.getCurrent(guildId);
      const isCurrentlyPlaying = pm.isPlaying(guildId);

      qm.addTracks(guildId, textChannelId, tracksToAdd);

      // If nothing was playing, set current to the first new track
      if (wasEmpty || !isCurrentlyPlaying) {
        const q = qm.get(guildId)!;
        if (wasEmpty) {
          q.current = q.tracks.length - tracksToAdd.length; // point to first added
        }

        // Join and play
        pm.join(voiceChannel);
        const success = await pm.play(guildId, ctx.client);

        if (!success) {
          await ctx.editReply(
            '❌ Không thể phát bài hát này. Thử bài khác nhé.',
          );
          return;
        }

        if (totalAddedCount === 1) {
          const t = tracksToAdd[0];
          const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setAuthor({ name: '🎵 Đang phát' })
            .setTitle(t.track.title)
            .setURL(t.track.url)
            .setDescription(
              `**${t.track.artist || 'Không rõ'}**${t.track.album ? ` • ${t.track.album}` : ''}\n` +
                `⏱ ${formatDuration(t.track.duration)}`,
            )
            .setThumbnail(t.track.thumbnail)
            .setFooter({ text: `Yêu cầu bởi ${t.requestedBy}` });
          await ctx.editReply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('📋 Đã thêm playlist vào queue')
            .setDescription(
              `Đang phát **${tracksToAdd[0].track.title}** — ${tracksToAdd[0].track.artist || 'Không rõ'}\n` +
                `+${totalAddedCount - 1} bài khác đã được thêm vào queue.`,
            );
          await ctx.editReply({ embeds: [embed] });
        }
      } else {
        // Already playing, just added to queue
        if (totalAddedCount === 1) {
          const t = tracksToAdd[0];
          const pos = qm.get(guildId)!.tracks.length;
          const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('✅ Đã thêm vào queue')
            .setDescription(
              `**${t.track.title}** — ${t.track.artist || 'Không rõ'}\n` +
                `⏱ ${formatDuration(t.track.duration)} • Vị trí: #${pos}`,
            )
            .setThumbnail(t.track.thumbnail);
          await ctx.editReply({ embeds: [embed] });
        } else {
          const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('✅ Đã thêm playlist vào queue')
            .setDescription(`+${totalAddedCount} bài đã được thêm vào queue.`);
          await ctx.editReply({ embeds: [embed] });
        }
      }
    } catch (error: any) {
      console.error('[play] Error:', error);
      await ctx.editReply(
        `❌ Lỗi: ${error.message || 'Không thể xử lý yêu cầu.'}`,
      );
    }
  },
};

export default play;
