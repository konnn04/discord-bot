import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const resumeAction: ActionCommand = {
  name: 'resume',
  description: 'Resume playback',
  helpDescription: 'Resumes the paused playback.',
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const { I18nService } = await import("@services/I18nService");

    MusicService.resume(ctx.guildId);
    await ctx.reply({ content: await I18nService.t(ctx.guildId, 'music.resumed'), ephemeral: false });
  },
};

export default resumeAction;

