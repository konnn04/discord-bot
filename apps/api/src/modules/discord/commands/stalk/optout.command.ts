import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';

const stalkOptout: ActionCommand = {
  name: 'stalk_optout',
  description: 'Chặn người khác dùng lệnh /stalk để theo dõi bạn',
  category: 'stalker',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const existing = await prisma.client.stalkerOptOut.findUnique({
      where: { userId: ctx.userId },
    });

    if (existing) {
      await prisma.client.stalkerOptOut.delete({
        where: { userId: ctx.userId },
      });
      await ctx.reply(
        '✅ Bạn đã **CHO PHÉP** người khác theo dõi bạn trở lại.',
      );
    } else {
      await prisma.client.stalkerOptOut.create({
        data: { userId: ctx.userId },
      });
      await ctx.reply(
        '🚫 Bạn đã **CHẶN** tính năng theo dõi. Không ai có thể /stalk bạn nữa.',
      );
    }
  },
};

export default stalkOptout;
