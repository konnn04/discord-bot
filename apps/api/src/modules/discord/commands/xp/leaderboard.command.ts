import { EmbedBuilder } from 'discord.js';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import {
  contextFromCommand,
  getLeaderboardAction,
  type LeaderboardType,
} from '../../actions';

const leaderboard: ActionCommand = {
  name: 'leaderboard',
  description: 'Xem bảng xếp hạng XP của server',
  category: 'xp',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'type',
      description: 'Loại bảng xếp hạng: all, month, year (Mặc định: all)',
      type: 'STRING',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const actionCtx = contextFromCommand(ctx, deps);
    if (!actionCtx) {
      await ctx.reply('❌ Lệnh này chỉ khả dụng trong server.');
      return;
    }

    const type = (
      (ctx.getOption('type', 'string') as string) || 'all'
    ).toLowerCase() as LeaderboardType;

    const result = await getLeaderboardAction(actionCtx, { type });
    const entries = result.data ?? [];
    if (!result.ok) {
      await ctx.reply(`❌ ${result.message}`);
      return;
    }
    if (entries.length === 0) {
      await ctx.reply('📭 Chưa có ai trong bảng xếp hạng.');
      return;
    }

    const title =
      type === 'month'
        ? '🏆 Bảng xếp hạng XP (Tháng này)'
        : type === 'year'
          ? '🏆 Bảng xếp hạng XP (Năm nay)'
          : '🏆 Bảng xếp hạng XP Server';

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(title)
      .setThumbnail(ctx.guild?.iconURL() || null);

    let description = '';
    for (const m of entries) {
      const medal =
        m.position === 1
          ? '🥇'
          : m.position === 2
            ? '🥈'
            : m.position === 3
              ? '🥉'
              : `**#${m.position}**`;
      const levelText = m.level != null ? ` (Lv. ${m.level})` : '';
      description += `${medal} **${m.username}** — ${m.xp} XP${levelText}\n`;
    }
    embed.setDescription(description);

    await ctx.reply({ embeds: [embed] });
  },
};

export default leaderboard;
