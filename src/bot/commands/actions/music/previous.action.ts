import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const previousAction: ActionCommand = {
  name: 'previous',
  description: 'Play previous song',
  helpDescription: 'Plays the previously played song in the queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const { I18nService } = await import("@services/I18nService");

    MusicService.previous(ctx.guildId);
    await ctx.reply(await I18nService.t(ctx.guildId, 'music.previous'));
  },
};

export default previousAction;
