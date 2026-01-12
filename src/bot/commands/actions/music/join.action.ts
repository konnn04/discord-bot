import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';
import { GuildMember } from 'discord.js';

import { I18nService } from '@services/I18nService';

export const joinAction: ActionCommand = {
  name: 'join',
  description: 'Summon bot to your voice channel',
  helpDescription: 'Makes the bot join the voice channel you are currently in.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    const member = ctx.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
         const msg = await I18nService.t(ctx.guildId, 'music.noVoice');
         await ctx.reply({ content: msg, ephemeral: true });
         return;
    }

    try {
        await MusicService.join(ctx.guild!, voiceChannel, ctx.channel as any);
        const msg = await I18nService.t(ctx.guildId, 'music.joined', { channel: voiceChannel.name });
        await ctx.reply(msg);
    } catch (e: any) {
        const msg = await I18nService.t(ctx.guildId, 'music.joinError', { error: e.message });
        await ctx.reply(msg);
    }
  },
};

export default joinAction;
