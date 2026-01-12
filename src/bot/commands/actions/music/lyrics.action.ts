import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { EmbedBuilder } from 'discord.js';
import { MusicService } from '@services/MusicService';

export const lyricsAction: ActionCommand = {
  name: 'lyrics',
  description: 'Get lyrics for a song',
  helpDescription: 'Fetches lyrics for the current or a specific song.',
  optionalArgs: [
      {
          name: 'song',
          description: 'Song title (optional)',
          type: 'STRING',
          required: false
      }
  ],
  async execute(ctx: ContextAdapter) {
    await ctx.defer();
    const song = ctx.getOption('song', 'string') as string | undefined;
    
    if (!ctx.guildId) return;

    const { I18nService } = await import("@services/I18nService");
    
    const lyricsData = await MusicService.getLyrics(ctx.guildId, song);
    
    if (!lyricsData) {
        await ctx.editReply({ content: await I18nService.t(ctx.guildId, 'music.lyricsNotFound') });
        return;
    }

    const lyricsText = Array.isArray(lyricsData.plainLyrics) 
        ? lyricsData.plainLyrics.join('\n') 
        : (lyricsData.plainLyrics || 'No lyrics text.');

    const embed = new EmbedBuilder()
        .setTitle(await I18nService.t(ctx.guildId, 'music.lyricsTitle', { track: lyricsData.trackName, artist: lyricsData.artistName }))
        .setDescription(lyricsText.substring(0, 4000)) 
        .setColor('#00ff00');

    await ctx.editReply({ embeds: [embed] });
  },
};

export default lyricsAction;
