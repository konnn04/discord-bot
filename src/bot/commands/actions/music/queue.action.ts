import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';
import { EmbedBuilder } from 'discord.js';

export const queueAction: ActionCommand = {
  name: 'queue',
  description: 'Show current music queue',
  helpDescription: 'Displays the list of songs in the current queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const { I18nService } = await import("@services/I18nService");

    const queue = MusicService.getQueue(ctx.guildId);
    if (!queue || queue.songs.length === 0) {
        await ctx.reply(await I18nService.t(ctx.guildId, 'music.queueEmpty'));
        return;
    }

    const current = queue.songs[0];
    const nextSongs = queue.songs.slice(1, 11); // Show next 10

    const description = nextSongs.map((s, i) => `${i + 1}. [${s.title}](${s.url}) - **${s.artist}**`).join('\n');
    
    const nowPlayingText = await I18nService.t(ctx.guildId, 'music.queueNowPlaying', { song: `[${current.title}](${current.url}) - **${current.artist}**` });
    const nextUpText = await I18nService.t(ctx.guildId, 'music.queueNextUp', { songs: description || await I18nService.t(ctx.guildId, 'music.queueNoNext') });
    
    const loopStatus = queue.loop ? await I18nService.t(ctx.guildId, 'music.loopOn') : await I18nService.t(ctx.guildId, 'music.loopOff');
    const footerText = await I18nService.t(ctx.guildId, 'music.queueFooter', { count: queue.songs.length, loop: loopStatus });

    const embed = new EmbedBuilder()
        .setTitle(await I18nService.t(ctx.guildId, 'music.queueTitle', { guild: ctx.guild?.name }))
        .setDescription(`${nowPlayingText}\n\n${nextUpText}`)
        .setFooter({ text: footerText })
        .setColor('#FFA500');

    await ctx.reply({ embeds: [embed] });
  },
};

export default queueAction;
