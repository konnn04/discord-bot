import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const loopAction: ActionCommand = {
  name: 'loop',
  description: 'Toggle queue loop mode',
  helpDescription: 'Toggles looping for the entire queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    const isLooping = await MusicService.toggleLoop(ctx.guildId);
    await ctx.reply(isLooping ? '🔁 Loop enabled.' : '➡️ Loop disabled.');
  },
};

export default loopAction;
