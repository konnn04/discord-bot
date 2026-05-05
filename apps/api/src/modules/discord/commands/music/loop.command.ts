import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getQueueManager } from '../../services/music/queue-manager';
import { EmbedBuilder } from 'discord.js';

const loop: ActionCommand = {
  name: 'loop',
  description: 'Cài đặt chế độ lặp lại',
  category: 'music',
  optionalArgs: [
    {
      name: 'mode',
      description: 'Chế độ (off, track, queue)',
      type: 'STRING',
      required: true,
      choices: [
        { name: 'Tắt', value: 'off' },
        { name: 'Lặp 1 bài', value: 'track' },
        { name: 'Lặp toàn bộ Queue', value: 'queue' },
      ],
    },
  ],

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) {
      await ctx.reply('❌ Lệnh này chỉ dùng trong server.');
      return;
    }

    const mode = ctx.getOption('mode', 'string') as 'off' | 'track' | 'queue';

    const qm = getQueueManager();
    const queue = qm.get(guildId);
    if (!queue) {
      await ctx.reply('❌ Không có hàng đợi nào.');
      return;
    }

    qm.setLoopMode(guildId, mode);

    let modeText = 'Tắt lặp lại';
    if (mode === 'track') modeText = '🔂 Lặp 1 bài hiện tại';
    if (mode === 'queue') modeText = '🔁 Lặp toàn bộ Queue';

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setDescription(`✅ Đã đổi chế độ: **${modeText}**`);

    await ctx.reply({ embeds: [embed] });
  },
};

export default loop;
