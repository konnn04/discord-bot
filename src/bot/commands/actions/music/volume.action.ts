import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';

export const volumeAction: ActionCommand = {
  name: 'volume',
  description: 'Set playback volume',
  helpDescription: 'Sets the volume of the music player (1-100).',
  optionalArgs: [
      {
          name: 'level',
          description: 'Volume level (1-100)',
          type: 'INTEGER',
          required: true
      }
  ],
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const level = ctx.getOption('level', 'integer') as number;

    if (level < 1 || level > 100) {
        await ctx.reply('❌ Volume must be between 1 and 100.');
        return;
    }

    MusicService.setVolume(ctx.guildId, level);
    await ctx.reply(`🔊 Volume set to **${level}%**.`);
  },
};

export default volumeAction;
