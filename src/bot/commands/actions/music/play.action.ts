import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';
import { TextChannel, GuildMember } from 'discord.js';

import { I18nService } from '@services/I18nService';

export const playAction: ActionCommand = {
  name: 'play',
  description: 'Play a song from YouTube/Spotify/SoundCloud',
  helpDescription: 'Usage: /play <query|url>',
  optionalArgs: [
      {
          name: 'query',
          description: 'Song name or URL',
          type: 'STRING',
          required: true
      }
  ],
  async execute(ctx: ContextAdapter) {
    const query = ctx.getOption('query', 'string') as string;
    const member = ctx.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
        const msg = await I18nService.t(ctx.guildId, 'music.noVoice');
        await ctx.reply({ content: msg, ephemeral: true });
        return;
    }

    await ctx.defer();
    
    await MusicService.play(
        ctx.guild!, 
        voiceChannel, 
        ctx.channel as TextChannel, 
        query, 
        ctx.user
    );

    const searchingMsg = await I18nService.t(ctx.guildId, 'music.searching', { query });
    await ctx.editReply({ content: searchingMsg });
  },
};

export default playAction;



