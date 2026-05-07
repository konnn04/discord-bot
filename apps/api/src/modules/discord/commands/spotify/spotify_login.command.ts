import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import { EmbedBuilder } from 'discord.js';

const spotifyLogin: ActionCommand = {
  name: 'spotify_login',
  description: 'Đăng nhập Spotify để truy cập playlist cá nhân',
  category: 'music',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri =
      process.env.SPOTIFY_REDIRECT_URI ||
      `http://localhost:3000/api/auth/spotify/callback`;

    if (!clientId) {
      await ctx.reply('❌ Spotify chưa được cấu hình.');
      return;
    }

    // Check if already logged in
    const existing = prisma
      ? await prisma.client.spotifyToken.findUnique({
          where: { userId: ctx.userId },
        })
      : null;
    if (existing) {
      const expired = new Date() >= existing.expiresAt;
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('🔐 Spotify')
            .setDescription(
              `Bạn đã đăng nhập Spotify.\n` +
                `Token ${expired ? '⚠️ đã hết hạn — cần đăng nhập lại' : '✅ còn hiệu lực'}.\n\n` +
                `Dùng \`/spotify\` để mở menu hoặc \`/spotify_logout\` để đăng xuất.`,
            ),
        ],
        flags: 64,
      });
      return;
    }

    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read',
      'user-top-read',
      'user-read-recently-played',
    ];
    const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&state=${ctx.userId}`;

    try {
      await ctx.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('🔐 Đăng nhập Spotify')
            .setDescription(
              `[**Nhấn vào đây để đăng nhập**](${url})\n\nSau khi đăng nhập, bot sẽ DM xác nhận & bạn có thể dùng:\n• \`/spotify\` — Menu tổng\n• \`/spotify_my\` — Playlist của bạn`,
            ),
        ],
      });
      await ctx.reply({
        content: '📬 Link đăng nhập đã gửi vào DM!',
        flags: 64,
      });
    } catch {
      await ctx.reply('❌ Không thể gửi DM. Hãy mở DM bot trước.');
    }
  },
};

export default spotifyLogin;
