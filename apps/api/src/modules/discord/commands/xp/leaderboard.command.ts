import { EmbedBuilder } from 'discord.js';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

interface LeaderboardEntry {
  position: number;
  username: string;
  xp: number;
  level: number | string;
}

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
    if (!deps?.prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const guildId = ctx.guildId;
    if (!guildId) {
      await ctx.reply('❌ Lệnh này chỉ khả dụng trong server.');
      return;
    }

    const typeArg = (
      (ctx.getOption('type', 'string') as string) || 'all'
    ).toLowerCase();

    let members: LeaderboardEntry[] = [];
    let title = '🏆 Bảng xếp hạng XP Server';

    try {
      if (typeArg === 'month' || typeArg === 'year') {
        const now = new Date();
        const period =
          typeArg === 'month'
            ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            : `${now.getFullYear()}`;

        title = `🏆 Bảng xếp hạng XP (${typeArg === 'month' ? 'Tháng này' : 'Năm nay'})`;

        const logs = await deps.prisma.guildMemberXp.findMany({
          where: { guildId, period },
          orderBy: { xp: 'desc' },
          take: 10,
          include: { user: true },
        });

        members = logs.map((log: any, index: number) => ({
          position: index + 1,
          username: log.user.username,
          xp: log.xp,
          level: 'N/A', // Period logs don't track level explicitly
        }));
      } else {
        // All time
        const topMembers = await deps.prisma.guildMember.findMany({
          where: { guildId, xp: { gt: 0 } },
          orderBy: { xp: 'desc' },
          take: 10,
          include: { user: true },
        });

        members = topMembers.map((m: any, index: number) => ({
          position: index + 1,
          username: m.user.username,
          xp: m.xp,
          level: m.level,
        }));
      }

      if (members.length === 0) {
        await ctx.reply('📭 Chưa có ai trong bảng xếp hạng.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(title)
        .setThumbnail(ctx.client.guilds.cache.get(guildId)?.iconURL() || null);

      let description = '';
      for (const m of members) {
        const medal =
          m.position === 1
            ? '🥇'
            : m.position === 2
              ? '🥈'
              : m.position === 3
                ? '🥉'
                : `**#${m.position}**`;
        const levelText = m.level !== 'N/A' ? ` (Lv. ${m.level})` : '';
        description += `${medal} **${m.username}** — ${m.xp} XP${levelText}\n`;
      }

      embed.setDescription(description);

      await ctx.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[Leaderboard Command Error]', error);
      await ctx.reply('❌ Có lỗi xảy ra khi lấy dữ liệu bảng xếp hạng.');
    }
  },
};

export default leaderboard;
