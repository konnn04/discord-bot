import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const shuffleAction: ActionCommand = {
  name: 'shuffle',
  description: 'Shuffle the queue',
  helpDescription: 'Randomizes the order of songs in the queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const { I18nService } = await import("@services/I18nService");

    MusicService.shuffle(ctx.guildId);
    await ctx.reply(await I18nService.t(ctx.guildId, 'music.shuffled'));
  },
};

export default shuffleAction;
