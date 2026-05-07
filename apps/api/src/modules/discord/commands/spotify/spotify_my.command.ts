import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import { EmbedBuilder } from 'discord.js';

interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: number;
  url: string;
  image?: string;
}

const spotifyMy: ActionCommand = {
  name: 'spotify_my',
  description: 'Xem playlist cá nhân trên Spotify (cần đăng nhập trước)',
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
      await ctx.reply(
        '🔐 Bạn chưa đăng nhập Spotify. Dùng `/spotify_login` trước nhé!',
      );
      return;
    }

    // Token expired — try refresh
    let accessToken = token.accessToken;
    if (new Date() >= token.expiresAt) {
      try {
        const refreshed = await refreshSpotifyToken(token.refreshToken);
        accessToken = refreshed.accessToken;
        await prisma.client.spotifyToken.update({
          where: { userId: ctx.userId },
          data: {
            accessToken: refreshed.accessToken,
            expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
          },
        });
      } catch {
        await ctx.reply(
          '⚠️ Token Spotify hết hạn. Dùng `/spotify_login` để đăng nhập lại.',
        );
        return;
      }
    }

    await ctx.defer();

    try {
      const playlists = await fetchUserPlaylists(accessToken);
      if (playlists.length === 0) {
        await ctx.editReply('📭 Bạn chưa có playlist nào trên Spotify.');
        return;
      }

      const lines = playlists
        .slice(0, 25)
        .map((p, i) => `**${i + 1}.** [${p.name}](${p.url}) — ${p.tracks} bài`);

      await ctx.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1db954)
            .setAuthor({
              name: ctx.author.username,
              iconURL: ctx.author.displayAvatarURL(),
            })
            .setTitle('🎧 Playlist Spotify của bạn')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Dùng /spotify_playlist link:<link> để phát' }),
        ],
      });
    } catch (err: any) {
      await ctx.editReply(`❌ Lỗi lấy playlist: ${err.message}`);
    }
  },
};

async function fetchUserPlaylists(token: string): Promise<SpotifyPlaylist[]> {
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify API: ${res.status}`);
  const json = await res.json();
  return (json.items || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    tracks: p.tracks?.total || 0,
    url: p.external_urls?.spotify || '',
    image: p.images?.[0]?.url,
  }));
}

async function refreshSpotifyToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify not configured');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  const json = await res.json();
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

export default spotifyMy;
