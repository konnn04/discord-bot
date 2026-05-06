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

          tracksToAdd.push({
            track: trackData,
            youtubeId:
              trackData.source === 'youtube' ? trackData.sourceId : undefined,
            requestedBy: ctx.author.username,
            requestedById: ctx.userId,
          });
          totalAddedCount = 1;

          // Background resolve Spotify for history (server handles streaming via /stream/play)
          if (trackData.source === 'spotify') {
            api
              .resolve(trackData.sourceId)
              .then((r) => {
                tracksToAdd[0].youtubeId = r.youtube.sourceId;
              })
              .catch(() => {});
          }
        } else if (parsed.type === 'playlist' || parsed.type === 'album') {
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

          // Add all tracks immediately — server resolves Spotify→YouTube at play time via /stream/play
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

          // Background: resolve Spotify tracks for history/prefetch (non-blocking)
          const spotifyIds = limited
            .filter((t: any) => t.source === 'spotify')
            .map((t: any) => t.sourceId);
          if (spotifyIds.length > 0) {
            api
              .resolveMany(spotifyIds)
              .then((results) => {
                for (const t of tracksToAdd) {
                  if (t.track.source === 'spotify' && !t.youtubeId) {
                    const r = results.get(t.track.sourceId);
                    if (r) t.youtubeId = r.youtube.sourceId;
                  }
                }
              })
              .catch(() => {});
          }
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

      const wasEmpty = !qm.getCurrent(guildId);
      const isCurrentlyPlaying = pm.isPlaying(guildId);

      qm.addTracks(guildId, textChannelId, tracksToAdd);

      if (wasEmpty || !isCurrentlyPlaying) {
        const q = qm.get(guildId)!;
        q.current = q.tracks.length - tracksToAdd.length;

        pm.join(voiceChannel);

        // Reply ngay, không đợi stream sẵn sàng
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
          const nowPlaying = tracksToAdd[0];
          const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('📋 Đã thêm playlist vào queue')
            .setDescription(
              `Đang tải **${nowPlaying.track.title}** — ${nowPlaying.track.artist || 'Không rõ'}\n` +
                `+${totalAddedCount - 1} bài khác đã được thêm vào queue.`,
            );
          await ctx.editReply({ embeds: [embed] });
        }

        // Phát nhạc nền — nếu lỗi thì sửa lại reply
        pm.playWithAutoSkip(guildId, ctx.client)
          .then((result) => {
            if (!result.success) {
              const extraInfo =
                result.autoSkippedCount > 0
                  ? ` (đã thử ${result.autoSkippedCount + 1} bài nhưng đều bị lỗi)`
                  : '';
              ctx
                .editReply(
                  `❌ Không thể phát bài hát nào${extraInfo}. Thử bài khác nhé.`,
                )
                .catch(() => {});
            }
          })
          .catch((err) => {
            console.error('[play] Background playback error:', err);
          });
      } else {
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
