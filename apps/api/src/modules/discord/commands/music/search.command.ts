import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} from 'discord.js';
import { getMusicApi } from '../../services/music/music-api.client';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { formatDuration } from '../../services/music/utils';

const search: ActionCommand = {
  name: 'search',
  description: 'Tìm kiếm bài hát và chọn từ danh sách',
  category: 'music',
  optionalArgs: [
    {
      name: 'query',
      description: 'Từ khóa tìm kiếm',
      type: 'STRING',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const query = ctx.getOption('query', 'string') as string;
    if (!query) {
      await ctx.reply('❌ Vui lòng nhập từ khóa tìm kiếm.');
      return;
    }

    await ctx.defer();

    const api = getMusicApi();
    if (!api.isConfigured()) {
      await ctx.editReply('❌ Music server chưa được cấu hình.');
      return;
    }

    try {
      const results = await api.search(query, 'all', 10);

      if (!results || results.length === 0) {
        await ctx.editReply('❌ Không tìm thấy kết quả nào.');
        return;
      }

      const options = results.slice(0, 10).map((track, i) => {
        const label = `${track.title}`.slice(0, 100);
        const desc =
          `${track.artist} • ${formatDuration(track.duration)} • ${track.source}`.slice(
            0,
            100,
          );
        return new StringSelectMenuOptionBuilder()
          .setLabel(label)
          .setDescription(desc)
          .setValue(`${i}`);
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_select')
        .setPlaceholder('Chọn bài hát để phát...')
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        selectMenu,
      );

      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`🔍 Kết quả tìm kiếm: "${query}"`)
        .setDescription(
          results
            .map(
              (t, i) =>
                `**${i + 1}.** ${t.title} — ${t.artist || 'Không rõ'} (${formatDuration(t.duration)}) [${t.source}]`,
            )
            .join('\n'),
        );

      const msg = await ctx.editReply({ embeds: [embed], components: [row] });

      // Wait for selection
      const message = 'fetch' in msg ? await msg.fetch() : msg;
      try {
        const interaction = await message.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 60_000,
          filter: (i) => i.user.id === ctx.author.id,
        });

        const selectedIdx = parseInt(interaction.values[0], 10);
        const selected = results[selectedIdx];

        if (!selected) {
          await interaction.update({
            content: '❌ Lựa chọn không hợp lệ.',
            embeds: [],
            components: [],
          });
          return;
        }

        // Resolve to YouTube ID
        let youtubeId = '';
        if (selected.source === 'youtube') {
          youtubeId = selected.sourceId;
        } else {
          try {
            const resolved = await api.resolve(selected.sourceId);
            youtubeId = resolved.youtube.sourceId;
          } catch {
            await interaction.update({
              content: '❌ Không thể resolve bài này sang YouTube.',
              embeds: [],
              components: [],
            });
            return;
          }
        }

        const voiceChannel = ctx.voiceChannel;
        if (!voiceChannel) {
          await interaction.update({
            content: '❌ Bạn cần vào kênh thoại trước!',
            embeds: [],
            components: [],
          });
          return;
        }

        const guildId = ctx.guildId!;
        const qm = getQueueManager();
        const pm = getPlayerManager();

        const wasEmpty = !qm.getCurrent(guildId) || !pm.isPlaying(guildId);

        qm.addTrack(guildId, ctx.channelId!, {
          track: selected,
          youtubeId,
          requestedBy: ctx.author.username,
          requestedById: ctx.userId,
        });

        if (wasEmpty) {
          const q = qm.get(guildId)!;
          q.current = q.tracks.length - 1;
          pm.join(voiceChannel);
          await pm.play(guildId, ctx.client);
        }

        const resultEmbed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle(wasEmpty ? '🎵 Đang phát' : '✅ Đã thêm vào queue')
          .setDescription(
            `**${selected.title}** — ${selected.artist || 'Không rõ'}\n⏱ ${formatDuration(selected.duration)}`,
          )
          .setThumbnail(selected.thumbnail);

        await interaction.update({ embeds: [resultEmbed], components: [] });
      } catch {
        // Timeout or error
        await message.edit({ components: [] }).catch(() => {});
      }
    } catch (error: any) {
      console.error('[search] Error:', error);
      await ctx.editReply(`❌ Lỗi: ${error.message || 'Không thể tìm kiếm.'}`);
    }
  },
};

export default search;
