import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';

const spotifyLogin: ActionCommand = {
  name: 'spotify_login',
  description: 'Đăng nhập Spotify để truy cập playlist cá nhân',
  category: 'music',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri =
      process.env.SPOTIFY_REDIRECT_URI ||
      `http://localhost:3000/api/auth/spotify/callback`;
    const state = ctx.userId;

    if (!clientId) {
      await ctx.reply(
        '❌ Spotify chưa được cấu hình. Bot owner cần set `SPOTIFY_CLIENT_ID` và `SPOTIFY_CLIENT_SECRET` trong .env.',
      );
      return;
    }

    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read',
    ];
    const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;

    try {
      await ctx.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1db954)
            .setTitle('🔐 Đăng nhập Spotify')
            .setDescription(
              `[**Nhấn vào đây để đăng nhập Spotify**](${url})\n\nSau khi đăng nhập, dùng \`/spotify_my\` để xem playlist của bạn.`,
            ),
        ],
      });
      await ctx.reply({
        content: '📬 Link đăng nhập đã được gửi vào DM của bạn!',
        flags: 64,
      });
    } catch {
      await ctx.reply('❌ Không thể gửi DM. Hãy mở DM bot trước.');
    }
  },
};

export default spotifyLogin;
