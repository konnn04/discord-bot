import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const loopAction: ActionCommand = {
  name: 'loop',
  description: 'Toggle queue loop mode',
  helpDescription: 'Toggles looping for the entire queue.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;

    const { I18nService } = await import("@services/I18nService");

    const isLooping = await MusicService.toggleLoop(ctx.guildId);
    const msg = isLooping ? await I18nService.t(ctx.guildId, 'music.loopEnabled') : await I18nService.t(ctx.guildId, 'music.loopDisabled');
    await ctx.reply(msg);
  },
};

export default loopAction;
