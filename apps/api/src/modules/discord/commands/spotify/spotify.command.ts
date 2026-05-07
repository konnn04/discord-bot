import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import { getMusicApi } from '../../services/music/music-api.client';
import {
  getQueueManager,
  type QueueTrack,
} from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { formatDuration } from '../../services/music/utils';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} from 'discord.js';

/** Direct Spotify API helpers */
async function spotifyGet(token: string, path: string): Promise<any> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  return res.json();
}

async function getAccessToken(
  userId: string,
  prisma: any,
): Promise<string | null> {
  const token = await prisma.client.spotifyToken.findUnique({
    where: { userId },
  });
  if (!token) return null;
  if (new Date() < token.expiresAt) return token.accessToken;
  // Refresh
  const cId = process.env.SPOTIFY_CLIENT_ID;
  const cSec = process.env.SPOTIFY_CLIENT_SECRET;
  if (!cId || !cSec) return null;
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' + Buffer.from(`${cId}:${cSec}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });
    const j = await r.json();
    if (!j.access_token) return null;
    await prisma.client.spotifyToken.update({
      where: { userId },
      data: {
        accessToken: j.access_token,
        expiresAt: new Date(Date.now() + j.expires_in * 1000),
      },
    });
    return j.access_token;
  } catch {
    return null;
  }
}

function mainMenuEmbed(username: string, loggedIn: boolean): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x1db954)
    .setAuthor({
      name: '🎧 Spotify',
      iconURL: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
    })
    .setDescription(
      `Xin chào **${username}**! Chọn tính năng bên dưới.\n\n${loggedIn ? '🔐 **Đã đăng nhập** — truy cập được playlist cá nhân, top artists, recommendations.' : '⚠️ **Chưa đăng nhập** — dùng `/spotify_login` để mở khóa thêm.'}`,
    );
}

function mainButtons(loggedIn: boolean): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('spot_menu_search')
      .setEmoji('🔍')
      .setLabel('Tìm kiếm')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('spot_menu_browse')
      .setEmoji('📖')
      .setLabel('Duyệt Featured')
      .setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    loggedIn
      ? new ButtonBuilder()
          .setCustomId('spot_menu_logout')
          .setEmoji('🔓')
          .setLabel('Đăng xuất')
          .setStyle(ButtonStyle.Danger)
      : new ButtonBuilder()
          .setCustomId('spot_menu_login')
          .setEmoji('🔐')
          .setLabel('Đăng nhập')
          .setStyle(ButtonStyle.Success),
  );
  if (loggedIn) {
    const row0 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('spot_menu_my')
        .setEmoji('📚')
        .setLabel('Playlist của tôi')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('spot_menu_artists')
        .setEmoji('🎤')
        .setLabel('Top Artists')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('spot_menu_recs')
        .setEmoji('💚')
        .setLabel('Gợi ý')
        .setStyle(ButtonStyle.Secondary),
    );
    return [row0, row1, row2];
  }
  return [row1, row2];
}

const spotify: ActionCommand = {
  name: 'spotify',
  description: 'Menu tổng Spotify — tìm kiếm, playlist, nghệ sĩ, gợi ý',
  category: 'music',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    const loggedIn = prisma
      ? !!(await prisma.client.spotifyToken.findUnique({
          where: { userId: ctx.userId },
        }))
      : false;

    const msg = await ctx.reply({
      embeds: [mainMenuEmbed(ctx.author.username, loggedIn)],
      components: mainButtons(loggedIn),
    });

    const col = msg.createMessageComponentCollector({ time: 120_000 });
    col.on('collect', async (i) => {
      if (i.user.id !== ctx.userId) {
        await i.reply({ content: '❌', flags: 64 });
        return;
      }

      const cid = i.customId;

      if (cid === 'spot_menu_search') {
        await i.reply({
          content:
            '🔍 Dùng `/spotify_search query:từ khóa` hoặc `/spotify_playlist query:từ khóa` để tìm nhạc.',
          flags: 64,
        });
        return;
      }
      if (cid === 'spot_menu_login') {
        await i.reply({
          content: '🔐 Dùng `/spotify_login` để đăng nhập.',
          flags: 64,
        });
        return;
      }
      if (cid === 'spot_menu_logout') {
        await i.reply({
          content: '🔓 Dùng `/spotify_logout` để đăng xuất.',
          flags: 64,
        });
        return;
      }

      // —— Needs auth ——
      if (!prisma) {
        await i.reply({ content: '❌ Hệ thống chưa sẵn sàng.', flags: 64 });
        return;
      }
      const token = await getAccessToken(ctx.userId, prisma);
      if (!token) {
        await i.reply({
          content: '🔐 Bạn cần đăng nhập Spotify trước! `/spotify_login`',
          flags: 64,
        });
        return;
      }

      await i.deferUpdate();

      if (cid === 'spot_menu_my') {
        try {
          const data = await spotifyGet(token, '/me/playlists?limit=25');
          const pls = (data.items || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            tracks: p.tracks?.total || 0,
            url: p.external_urls?.spotify || '',
            image: p.images?.[0]?.url,
          }));
          if (!pls.length) {
            await i.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x1db954)
                  .setTitle('📚 Playlist của bạn')
                  .setDescription('Chưa có playlist nào.'),
              ],
              components: [],
            });
            return;
          }
          await i.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1db954)
                .setAuthor({
                  name: '📚 Playlist của bạn',
                  iconURL: ctx.author.displayAvatarURL(),
                })
                .setDescription(
                  pls
                    .map(
                      (p: any, idx: number) =>
                        `**${idx + 1}.** [${p.name}](${p.url}) — ${p.tracks} bài`,
                    )
                    .join('\n'),
                )
                .setFooter({
                  text: 'Dùng /spotify_playlist query:link để phát',
                }),
            ],
            components: [],
          });
        } catch (e: any) {
          await i.editReply(`❌ Lỗi: ${e.message}`);
        }
      }

      if (cid === 'spot_menu_artists') {
        try {
          const data = await spotifyGet(
            token,
            '/me/top/artists?limit=15&time_range=medium_term',
          );
          const artists = (data.items || []).map((a: any) => ({
            name: a.name,
            genres: (a.genres || []).slice(0, 3).join(', '),
            url: a.external_urls?.spotify || '',
            image: a.images?.[1]?.url,
            followers: a.followers?.total,
          }));
          await i.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1db954)
                .setAuthor({
                  name: '🎤 Top Artists',
                  iconURL: ctx.author.displayAvatarURL(),
                })
                .setDescription(
                  artists
                    .map(
                      (a: any, idx: number) =>
                        `**${idx + 1}.** [${a.name}](${a.url}) — ${a.genres || 'N/A'}`,
                    )
                    .join('\n'),
                ),
            ],
            components: [],
          });
        } catch (e: any) {
          await i.editReply(`❌ Lỗi: ${e.message}`);
        }
      }

      if (cid === 'spot_menu_recs') {
        try {
          const topTracks = await spotifyGet(
            token,
            '/me/top/tracks?limit=5&time_range=short_term',
          );
          const seedTrack = topTracks.items?.[0];
          if (!seedTrack) {
            await i.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x1db954)
                  .setTitle('💚 Gợi ý')
                  .setDescription('Cần nghe thêm nhạc để có gợi ý.'),
              ],
              components: [],
            });
            return;
          }
          const recs = await spotifyGet(
            token,
            `/recommendations?limit=10&seed_tracks=${seedTrack.id}`,
          );
          const tracks = (recs.tracks || []).map((t: any) => ({
            artist: t.artists?.[0]?.name || '???',
            title: t.name,
            url: t.external_urls?.spotify || '',
            album: t.album?.name,
            image: t.album?.images?.[2]?.url,
            id: t.id,
            duration: Math.round(t.duration_ms / 1000),
          }));

          // Show as selectable
          const sel = new StringSelectMenuBuilder()
            .setCustomId('spot_recs_sel')
            .setPlaceholder('Chọn bài để phát...');
          tracks.forEach((t: any) =>
            sel.addOptions(
              new StringSelectMenuOptionBuilder()
                .setLabel(`${t.artist} — ${t.title}`.slice(0, 100))
                .setValue(t.id)
                .setDescription(t.album?.slice(0, 50) || ''),
            ),
          );
          const msg2 = await i.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle(`💚 Gợi ý từ: ${seedTrack.name}`)
                .setDescription(
                  tracks
                    .map(
                      (t: any, idx: number) =>
                        `**${idx + 1}.** **${t.artist}** — ${t.title.slice(0, 40)}`,
                    )
                    .join('\n'),
                )
                .setFooter({ text: 'Chọn bài bên dưới để phát' }),
            ],
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                sel,
              ),
            ],
          });

          const col2 = msg2.createMessageComponentCollector({ time: 60_000 });
          col2.on('collect', async (j) => {
            if (j.user.id !== ctx.userId) {
              await j.reply({ content: '❌', flags: 64 });
              return;
            }
            const sid = (j as any).values?.[0];
            const t = tracks.find((x: any) => x.id === sid);
            if (!t) return;
            const api = getMusicApi();
            if (!api.isConfigured()) {
              await j.reply({
                content: '❌ Music server chưa cấu hình.',
                flags: 64,
              });
              return;
            }
            const vc = ctx.voiceChannel;
            if (!vc) {
              await j.reply({ content: '❌ Vào kênh thoại trước.', flags: 64 });
              return;
            }
            await j.deferUpdate();
            const resolved = await api.searchAndResolve(
              `${t.artist} ${t.title}`,
            );
            const qm = getQueueManager();
            const pm = getPlayerManager();
            const qt: QueueTrack = {
              track: resolved.track,
              youtubeId: resolved.youtubeId,
              requestedBy: ctx.author.username,
              requestedById: ctx.userId,
            };
            const wasEmpty = !qm.getCurrent(ctx.guildId!);
            qm.addTrack(ctx.guildId!, ctx.channelId!, qt);
            if (wasEmpty) {
              const q = qm.get(ctx.guildId!)!;
              q.current = q.tracks.length - 1;
              pm.join(vc);
              void pm.playWithAutoSkip(ctx.guildId!, ctx.client);
            }
            await j.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0x1db954)
                  .setTitle('🎧 Đã thêm')
                  .setThumbnail(t.image)
                  .setDescription(
                    `**${t.artist} — ${t.title}**\n⏱ ${formatDuration(t.duration)}`,
                  ),
              ],
              components: [],
            });
          });
        } catch (e: any) {
          await i.editReply(`❌ Lỗi: ${e.message}`);
        }
      }

      if (cid === 'spot_menu_browse') {
        try {
          // Use client credentials for browse (no user login needed)
          const cId = process.env.SPOTIFY_CLIENT_ID;
          const cSec = process.env.SPOTIFY_CLIENT_SECRET;
          if (!cId || !cSec) {
            await i.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xef4444)
                  .setTitle('❌ Spotify chưa cấu hình.'),
              ],
              components: [],
            });
            return;
          }
          const authRes = await fetch(
            'https://accounts.spotify.com/api/token',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization:
                  'Basic ' + Buffer.from(`${cId}:${cSec}`).toString('base64'),
              },
              body: 'grant_type=client_credentials',
            },
          );
          const auth = await authRes.json();
          const featured = await spotifyGet(
            auth.access_token,
            '/browse/featured-playlists?limit=10',
          );
          const pls = (featured.playlists?.items || []).map((p: any) => ({
            name: p.name,
            tracks: p.tracks?.total || 0,
            url: p.external_urls?.spotify || '',
            image: p.images?.[0]?.url,
            desc: p.description?.slice(0, 60) || '',
          }));
          await i.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle('📖 Featured Playlists')
                .setDescription(
                  pls
                    .map(
                      (p: any, idx: number) =>
                        `**${idx + 1}.** [${p.name}](${p.url}) — ${p.tracks} bài\n> ${p.desc || ''}`,
                    )
                    .join('\n'),
                )
                .setFooter({
                  text: 'Dùng /spotify_playlist query:link để phát',
                }),
            ],
            components: [],
          });
        } catch (e: any) {
          await i.editReply(`❌ Lỗi: ${e.message}`);
        }
      }
    });
  },
};

export default spotify;
