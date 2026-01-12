import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';
import { EmbedBuilder } from 'discord.js';
import { formatDuration } from '@src/utils/formatUtils';

export const nowPlayingAction: ActionCommand = {
  name: 'nowplaying',
  description: 'Show currently playing song',
  helpDescription: 'Displays detailed information about the currently playing song.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const { I18nService } = await import("@services/I18nService");

    const queue = MusicService.getQueue(ctx.guildId);
    if (!queue || !queue.playing || !queue.songs[0]) {
        await ctx.reply(await I18nService.t(ctx.guildId, 'music.nothingPlaying'));
        return;
    }

    const song = queue.songs[0];
    const embed = new EmbedBuilder()
        .setTitle(await I18nService.t(ctx.guildId, 'music.nowPlaying'))
        .setDescription(`[${song.title}](${song.url})`)
        .addFields(
            { name: await I18nService.t(ctx.guildId, 'music.artist'), value: song.artist || 'Unknown', inline: true },
            { name: await I18nService.t(ctx.guildId, 'music.requestedBy'), value: `<@${song.requester?.id}>`, inline: true },
            { name: await I18nService.t(ctx.guildId, 'music.duration'), value: formatDuration(song.duration), inline: true },
            { name: await I18nService.t(ctx.guildId, 'music.platform'), value: song.source ? song.source.charAt(0).toUpperCase() + song.source.slice(1) : 'Unknown', inline: true }
        )
        .setThumbnail(song.thumbnail)
        .setColor('#0099ff');

    await ctx.reply({ embeds: [embed] });
  },
};

export default nowPlayingAction;

