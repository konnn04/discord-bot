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
    
    const lyricsData = await MusicService.getLyrics(ctx.guildId, song);
    
    if (!lyricsData) {
        await ctx.editReply({ content: '❌ Lyrics not found.' });
        return;
    }

    const lyricsText = Array.isArray(lyricsData.plainLyrics) 
        ? lyricsData.plainLyrics.join('\n') 
        : (lyricsData.plainLyrics || 'No lyrics text.');

    const embed = new EmbedBuilder()
        .setTitle(`Lyrics: ${lyricsData.trackName} - ${lyricsData.artistName}`)
        .setDescription(lyricsText.substring(0, 4000)) 
        .setColor('#00ff00');

    await ctx.editReply({ embeds: [embed] });
  },
};

export default lyricsAction;
