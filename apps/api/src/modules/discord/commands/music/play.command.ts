import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { contextFromCommand, playMusicAction } from '../../actions';
import { formatDuration } from '../../services/music/utils';

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

  async execute(ctx: ContextAdapter, deps?: any) {
    const query = ctx.getOption('query', 'string') as string;
    if (!query) {
      await ctx.reply('❌ Vui lòng nhập link hoặc từ khóa tìm kiếm.');
      return;
    }

    const actionCtx = contextFromCommand(ctx, deps);
    if (!actionCtx) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    await ctx.defer();

    const result = await playMusicAction(actionCtx, { query });
    if (!result.ok || !result.data) {
      await ctx.editReply(`❌ ${result.message}`);
      return;
    }

    const {
      startedPlaying,
      added,
      totalAdded,
      queuePosition,
      playbackPromise,
    } = result.data;
    const first = added[0];

    if (startedPlaying) {
      if (totalAdded === 1) {
        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setAuthor({ name: '🎵 Đang phát' })
          .setTitle(first.track.title)
          .setURL(first.track.url)
          .setDescription(
            `**${first.track.artist || 'Không rõ'}**${first.track.album ? ` • ${first.track.album}` : ''}\n` +
              `⏱ ${formatDuration(first.track.duration)}`,
          )
          .setThumbnail(first.track.thumbnail)
          .setFooter({ text: `Yêu cầu bởi ${first.requestedBy}` });
        await ctx.editReply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle('📋 Đã thêm playlist vào queue')
          .setDescription(
            `Đang tải **${first.track.title}** — ${first.track.artist || 'Không rõ'}\n` +
              `+${totalAdded - 1} bài khác đã được thêm vào queue.`,
          );
        await ctx.editReply({ embeds: [embed] });
      }

      // Surface late playback failures (all tracks errored).
      playbackPromise
        ?.then((r) => {
          if (!r.success) {
            const extra =
              r.autoSkippedCount > 0
                ? ` (đã thử ${r.autoSkippedCount + 1} bài nhưng đều bị lỗi)`
                : '';
            ctx
              .editReply(
                `❌ Không thể phát bài hát nào${extra}. Thử bài khác nhé.`,
              )
              .catch(() => {});
          }
        })
        .catch((err) =>
          console.error('[play] Background playback error:', err),
        );
      return;
    }

    if (totalAdded === 1) {
      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('✅ Đã thêm vào queue')
        .setDescription(
          `**${first.track.title}** — ${first.track.artist || 'Không rõ'}\n` +
            `⏱ ${formatDuration(first.track.duration)} • Vị trí: #${queuePosition}`,
        )
        .setThumbnail(first.track.thumbnail);
      await ctx.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('✅ Đã thêm playlist vào queue')
        .setDescription(`+${totalAdded} bài đã được thêm vào queue.`);
      await ctx.editReply({ embeds: [embed] });
    }
  },
};

export default play;
