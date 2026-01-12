import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const removeAction: ActionCommand = {
  name: 'remove',
  description: 'Remove a song from queue',
  helpDescription: 'Removes a song from the queue at the specified index.',
  optionalArgs: [
      {
          name: 'index',
          description: 'Index of song to remove',
          type: 'INTEGER',
          required: true
      }
  ],
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const index = ctx.getOption('index', 'integer') as number;

    const success = MusicService.removeSong(ctx.guildId, index);
    if (success) {
        await ctx.reply(`✅ Removed song at index **${index}**.`);
    } else {
        await ctx.reply('❌ Invalid index or queue empty.');
    }
  },
};

export default removeAction;
