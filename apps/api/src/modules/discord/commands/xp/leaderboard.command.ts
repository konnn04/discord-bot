import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import {
  contextFromCommand,
  getLeaderboardAction,
  type LeaderboardType,
} from '../../actions';
import { renderLeaderboardCard } from '../../utils/leaderboard-card';

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

    await ctx.defer();

    const type = (
      (ctx.getOption('type', 'string') as string) || 'all'
    ).toLowerCase() as LeaderboardType;

    const result = await getLeaderboardAction(actionCtx, { type });
    const entries = result.data ?? [];
    if (!result.ok) {
      await ctx.editReply(`❌ ${result.message}`);
      return;
    }
    if (entries.length === 0) {
      await ctx.editReply('📭 Chưa có ai trong bảng xếp hạng.');
      return;
    }

    const title =
      type === 'month'
        ? 'Bảng Xếp Hạng XP (Tháng Này)'
        : type === 'year'
          ? 'Bảng Xếp Hạng XP (Năm Nay)'
          : 'Bảng Xếp Hạng XP Server';

    const visualEntries = await Promise.all(
      entries.map(async (e) => {
        let avatarUrl: string | undefined;
        if (e.userId) {
          try {
            const u = await ctx.client?.users
              ?.fetch(e.userId)
              .catch(() => null);
            avatarUrl = u?.displayAvatarURL({ extension: 'png', size: 128 });
          } catch {
            // Ignore avatar fetch failures
          }
        }
        return {
          ...e,
          avatarUrl,
        };
      }),
    );

    const serverName = ctx.guild?.name || 'Server';
    const cardBuf = await renderLeaderboardCard({
      title,
      serverName,
      entries: visualEntries,
    });

    const file = new AttachmentBuilder(cardBuf, { name: 'leaderboard.png' });
    const embed = new EmbedBuilder()
      .setColor(0xff5c26)
      .setTitle(`🏆 ${title}`)
      .setImage('attachment://leaderboard.png');

    await ctx.editReply({ embeds: [embed], files: [file] });
  },
};

export default leaderboard;
