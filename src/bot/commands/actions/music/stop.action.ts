import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const stopAction: ActionCommand = {
  name: 'stop',
  description: 'Stop music and clear queue',
  helpDescription: 'Stops the current playback and clears the queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    
    MusicService.stop(ctx.guildId);
    await ctx.reply({ content: '⏹️ Stopped.', ephemeral: false });
  },
};

export default stopAction;

