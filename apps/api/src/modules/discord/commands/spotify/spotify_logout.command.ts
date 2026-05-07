import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import { EmbedBuilder } from 'discord.js';

const spotifyLogout: ActionCommand = {
  name: 'spotify_logout',
  description: 'Đăng xuất Spotify, xóa token đã lưu',
  category: 'music',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const token = await prisma.client.spotifyToken.findUnique({
      where: { userId: ctx.userId },
    });
    if (!token) {
      await ctx.reply('🔐 Bạn chưa đăng nhập Spotify.');
      return;
    }

    await prisma.client.spotifyToken.delete({ where: { userId: ctx.userId } });

    await ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('🔓 Đã đăng xuất Spotify')
          .setDescription(
            'Token đã bị xóa. Dùng `/spotify_login` để đăng nhập lại.',
          ),
      ],
    });
  },
};

export default spotifyLogout;
