import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const skipAction: ActionCommand = {
  name: 'skip',
  description: 'Skip current song',
  helpDescription: 'Skips the current song to the next one in queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    MusicService.skip(ctx.guildId);
    await ctx.reply({ content: '⏭️ Skipped.', ephemeral: false });
  },
};

export default skipAction;

