import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const previousAction: ActionCommand = {
  name: 'previous',
  description: 'Play previous song',
  helpDescription: 'Plays the previously played song in the queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    MusicService.previous(ctx.guildId);
    await ctx.reply('⏮️ Playing previous song.');
  },
};

export default previousAction;
