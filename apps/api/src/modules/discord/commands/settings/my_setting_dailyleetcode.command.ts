import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';

const myDailyLeetcode: ActionCommand = {
  name: 'my_setting_dailyleetcode',
  description: 'Bật/tắt nhận LeetCode Daily qua tin nhắn riêng',
  category: 'settings',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'state',
      description: 'Bật (True) hoặc Tắt (False)',
      type: 'BOOLEAN',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const state = ctx.getOption('state', 'boolean') as boolean;
    if (state === null || state === undefined) return;

    const discordId = ctx.userId;

    try {
      await prisma.client.user.upsert({
        where: { discordId },
        update: { leetcodeDailyDm: state },
        create: {
          discordId,
          username: ctx.author.username,
          leetcodeDailyDm: state,
        },
      });

      if (state) {
        await ctx.reply(
          '✅ Bạn sẽ nhận LeetCode Daily qua **tin nhắn riêng** lúc 8:00 sáng mỗi ngày.\n' +
            'Hãy đảm bảo bạn cho phép bot nhắn tin riêng.',
        );
      } else {
        await ctx.reply(
          '✅ Đã **TẮT** nhận LeetCode Daily qua tin nhắn riêng.',
        );
      }
    } catch (err: any) {
      await ctx.reply(`❌ Lỗi: ${err.message || 'Không thể lưu cài đặt.'}`);
    }
  },
};

export default myDailyLeetcode;
