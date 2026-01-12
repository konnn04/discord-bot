import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';
import { GuildMember } from 'discord.js';

export const joinAction: ActionCommand = {
  name: 'join',
  description: 'Summon bot to your voice channel',
  helpDescription: 'Makes the bot join the voice channel you are currently in.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    const member = ctx.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
         await ctx.reply({ content: '❌ You must be in a voice channel!', ephemeral: true });
         return;
    }

    try {
        await MusicService.join(ctx.guild!, voiceChannel, ctx.channel as any);
        await ctx.reply(`🔊 Joined **${voiceChannel.name}**!`);
    } catch (e: any) {
        await ctx.reply(`❌ Failed to join: ${e.message}`);
    }
  },
};

export default joinAction;
