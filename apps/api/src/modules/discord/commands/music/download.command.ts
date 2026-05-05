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
import { formatDuration } from '../../services/music/utils';

const download: ActionCommand = {
  name: 'download',
  description: 'Lấy link tải nhạc từ URL YouTube/Spotify',
  category: 'music',
  optionalArgs: [
    {
      name: 'url',
      description: 'Link YouTube hoặc Spotify',
      type: 'STRING',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const url = ctx.getOption('url', 'string') as string;
    if (!url) {
      await ctx.reply('❌ Vui lòng nhập URL.');
      return;
    }

    await ctx.defer();

    const api = getMusicApi();
    if (!api.isConfigured()) {
      await ctx.editReply('❌ Music server chưa được cấu hình.');
      return;
    }

    try {
      // Parse the URL to get track info
      const parsed = await api.parseUrl(url, 'track');

      if (parsed.type !== 'track') {
        await ctx.editReply(
          '❌ Chỉ hỗ trợ tải bài đơn lẻ, không hỗ trợ playlist.',
        );
        return;
      }

      const trackData = parsed.data as any;
      let youtubeId = '';

      if (trackData.source === 'youtube') {
        youtubeId = trackData.sourceId;
      } else if (trackData.source === 'spotify') {
        const resolved = await api.resolve(trackData.sourceId);
        youtubeId = resolved.youtube.sourceId;
      }

      if (!youtubeId) {
        await ctx.editReply('❌ Không thể resolve YouTube ID cho bài này.');
        return;
      }

      // Get stream info for available formats
      let formats: any[] = [];
      try {
        const info = await api.getStreamInfo(youtubeId);
        formats = info.audioFormats || [];
      } catch {
        // If getStreamInfo fails, offer default proxy stream
        formats = [];
      }

      if (formats.length === 0) {
        // Provide direct proxy download link
        const streamUrl = await api.getPublicDownloadUrl(youtubeId);
        const embed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle(`📥 ${trackData.title}`)
          .setDescription(
            `**${trackData.artist}** • ${formatDuration(trackData.duration)}\n\n` +
              `[📥 Tải xuống (audio/webm)](${streamUrl})`,
          )
          .setThumbnail(trackData.thumbnail);

        await ctx.editReply({ embeds: [embed] });
        return;
      }

      // Build select menu with format options
      const options = formats.map((f: any) => {
        const size = f.fileSize
          ? `${(f.fileSize / 1024 / 1024).toFixed(1)}MB`
          : 'N/A';
        const label = `${f.quality} — ${f.ext} (${Math.round(f.abr)}kbps)`;
        const desc = `Codec: ${f.acodec} • Size: ${size}`;
        return new StringSelectMenuOptionBuilder()
          .setLabel(label.slice(0, 100))
          .setDescription(desc.slice(0, 100))
          .setValue(f.formatId);
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('download_format')
        .setPlaceholder('Chọn format tải xuống...')
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        selectMenu,
      );

      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`📥 ${trackData.title}`)
        .setDescription(
          `**${trackData.artist}** • ${formatDuration(trackData.duration)}\n\n` +
            'Chọn format bên dưới để nhận link tải:',
        )
        .setThumbnail(trackData.thumbnail);

      const msg = await ctx.editReply({ embeds: [embed], components: [row] });

      // Wait for selection
      const message = 'fetch' in msg ? await msg.fetch() : msg;
      try {
        const interaction = await message.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: 60_000,
          filter: (i) => i.user.id === ctx.author.id,
        });

        const formatId = interaction.values[0];
        const streamUrl = await api.getPublicDownloadUrl(youtubeId, formatId);
        const selectedFormat = formats.find(
          (f: any) => f.formatId === formatId,
        );

        const resultEmbed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle(`📥 ${trackData.title}`)
          .setDescription(
            `**${trackData.artist}** • ${formatDuration(trackData.duration)}\n\n` +
              `Format: **${selectedFormat?.quality || 'N/A'}** — ${selectedFormat?.ext || 'audio'} (${Math.round(selectedFormat?.abr || 0)}kbps)\n\n` +
              `[📥 Click để tải xuống](${streamUrl})`,
          )
          .setThumbnail(trackData.thumbnail);

        await interaction.update({ embeds: [resultEmbed], components: [] });
      } catch {
        await message.edit({ components: [] }).catch(() => {});
      }
    } catch (error: any) {
      console.error('[download] Error:', error);
      await ctx.editReply(`❌ Lỗi: ${error.message || 'Không thể xử lý URL.'}`);
    }
  },
};

export default download;
