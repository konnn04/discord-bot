import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getPlayerManager } from '../../services/music/player-manager';
import { getQueueManager } from '../../services/music/queue-manager';

const volume: ActionCommand = {
  name: 'volume',
  description: 'Chỉnh âm lượng (0-100)',
  category: 'music',
  optionalArgs: [
    {
      name: 'level',
      description: 'Mức âm lượng (0-100)',
      type: 'INTEGER',
      required: true,
      minValue: 0,
      maxValue: 100,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const level = ctx.getOption('level', 'integer') as number;
    const pm = getPlayerManager();
    const qm = getQueueManager();

    pm.setVolume(guildId, level);

    const emoji =
      level === 0 ? '🔇' : level < 30 ? '🔈' : level < 70 ? '🔉' : '🔊';
    await ctx.reply(`${emoji} Âm lượng: **${qm.getVolume(guildId)}%**`);
  },
};

export default volume;
