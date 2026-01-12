import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const shuffleAction: ActionCommand = {
  name: 'shuffle',
  description: 'Shuffle the queue',
  helpDescription: 'Randomizes the order of songs in the queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    MusicService.shuffle(ctx.guildId);
    await ctx.reply('🔀 Queue shuffled.');
  },
};

export default shuffleAction;
