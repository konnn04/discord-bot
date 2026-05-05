import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { getMusicApi } from '../../services/music/music-api.client';
import { getQueueManager } from '../../services/music/queue-manager';
import { truncate } from '../../services/music/utils';

const lyrics: ActionCommand = {
  name: 'lyrics',
  description: 'Lấy lời bài hát (bài đang phát hoặc tìm kiếm)',
  category: 'music',
  optionalArgs: [
    {
      name: 'query',
      description: 'Tên bài hát (để trống = bài đang phát)',
      type: 'STRING',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter) {
    await ctx.defer();

    const api = getMusicApi();
    if (!api.isConfigured()) {
      await ctx.editReply('❌ Music server chưa được cấu hình.');
      return;
    }

    const query = ctx.getOption('query', 'string') as string | null;
    let trackName = '';
    let artistName = '';

    if (query) {
      // Use query as-is
      trackName = query;
    } else {
      // Get from currently playing
      const guildId = ctx.guildId;
      if (!guildId) {
        await ctx.editReply(
          '❌ Vui lòng nhập tên bài hát hoặc phát nhạc trước.',
        );
        return;
      }
      const current = getQueueManager().getCurrent(guildId);
      if (!current) {
        await ctx.editReply(
          '❌ Không có bài đang phát. Vui lòng nhập tên bài hát.',
        );
        return;
      }
      trackName = current.track.title;
      artistName = current.track.artist;
    }

    try {
      const result = await api.getLyrics(trackName, artistName || trackName);

      if (!result || !result.plainLyrics) {
        await ctx.editReply('❌ Không tìm thấy lời bài hát.');
        return;
      }

      const lyricsText = truncate(result.plainLyrics, 3900);

      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`📝 ${result.trackName}`)
        .setDescription(lyricsText)
        .setFooter({
          text: `${result.artistName}${result.albumName ? ` • ${result.albumName}` : ''}`,
        });

      await ctx.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error('[lyrics] Error:', error);
      await ctx.editReply(
        `❌ ${error.message || 'Không thể lấy lời bài hát.'}`,
      );
    }
  },
};

export default lyrics;
