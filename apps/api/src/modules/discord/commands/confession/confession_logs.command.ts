import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import { EmbedBuilder } from 'discord.js';

const confessionLogs: ActionCommand = {
  name: 'confession_logs',
  description: 'Xem lịch sử confession (chỉ Admin)',
  category: 'confession',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'page',
      description: 'Số trang (mặc định: 1)',
      type: 'INTEGER',
      required: false,
      minValue: 1,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!ctx.guildId) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    await ctx.defer(true);

    const page = (ctx.getOption('page', 'integer') as number) || 1;
    const perPage = 10;

    const [logs, total] = await Promise.all([
      prisma.client.confessionLog.findMany({
        where: { guildId: ctx.guildId },
        orderBy: { postedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.client.confessionLog.count({
        where: { guildId: ctx.guildId },
      }),
    ]);

    if (logs.length === 0) {
      await ctx.editReply('📭 Chưa có confession nào.');
      return;
    }

    const lines = logs.map((log, i) => {
      const date = `<t:${Math.floor(log.postedAt.getTime() / 1000)}:R>`;
      const preview =
        log.content.length > 50
          ? log.content.slice(0, 47) + '...'
          : log.content;
      return `**${(page - 1) * perPage + i + 1}.** <@${log.authorId}> — ${preview}\n└ ${date}`;
    });

    const totalPages = Math.ceil(total / perPage);
    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('📋 Lịch sử Confession')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Trang ${page}/${totalPages} • Tổng: ${total}` });

    await ctx.editReply({ embeds: [embed] });
  },
};

export default confessionLogs;
