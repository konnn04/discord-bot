import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const pauseAction: ActionCommand = {
  name: 'pause',
  description: 'Pause playback',
  helpDescription: 'Pauses the current playback.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    MusicService.pause(ctx.guildId);
    await ctx.reply({ content: '⏸️ Paused.', ephemeral: false });
  },
};

export default pauseAction;

