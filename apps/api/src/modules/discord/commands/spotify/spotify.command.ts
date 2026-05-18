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

async function spotifyGet(token: string, path: string): Promise<any> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) throw new Error('SPOTIFY_AUTH');
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
    if (!j.access_token) {
      await prisma.client.spotifyToken
        .delete({ where: { userId } })
        .catch(() => {});
      return null;
    }
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

async function getClientToken(): Promise<string | null> {
  const cId = process.env.SPOTIFY_CLIENT_ID;
  const cSec = process.env.SPOTIFY_CLIENT_SECRET;
  if (!cId || !cSec) return null;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' + Buffer.from(`${cId}:${cSec}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  return (await r.json()).access_token || null;
}

function backBtn(state?: string): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(state ? `spot_back_${state}` : 'spot_back')
    .setEmoji('🔙')
    .setLabel('Quay lại')
    .setStyle(ButtonStyle.Secondary);
}
function authErrEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle('🔐 Cần đăng nhập lại')
    .setDescription(
      'Token Spotify hết hạn hoặc thiếu quyền.\nDùng `/spotify_logout` rồi `/spotify_login` lại nhé!',
    );
}

function mainEmbed(username: string, loggedIn: boolean): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x1db954)
    .setAuthor({
      name: '🎧 Spotify',
      iconURL: 'https://cdn-icons-png.flaticon.com/512/174/174872.png',
    })
    .setDescription(
      `Xin chào **${username}**!\n\n${loggedIn ? '🔐 **Đã đăng nhập**' : '⚠️ **Chưa đăng nhập** — `/spotify_login`'}`,
    )
    .setFooter({ text: 'Bấm nút bên dưới để khám phá' });
}

function mainRows(loggedIn: boolean): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  if (loggedIn) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('spot_my')
          .setEmoji('📚')
          .setLabel('Playlist')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('spot_made')
          .setEmoji('✨')
          .setLabel('Featured (Made for u)')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('spot_artists')
          .setEmoji('🎤')
          .setLabel('Top Artists')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('spot_recs')
          .setEmoji('🔂')
          .setLabel('Vừa nghe')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  }
  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('spot_search')
        .setEmoji('🔍')
        .setLabel('Tìm kiếm')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('spot_browse')
        .setEmoji('📖')
        .setLabel('Featured')
        .setStyle(ButtonStyle.Primary),
    ),
  );
  rows.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      loggedIn
        ? new ButtonBuilder()
            .setCustomId('spot_logout')
            .setEmoji('🔓')
            .setLabel('Đăng xuất')
            .setStyle(ButtonStyle.Danger)
        : new ButtonBuilder()
            .setCustomId('spot_login')
            .setEmoji('🔐')
            .setLabel('Đăng nhập')
            .setStyle(ButtonStyle.Success),
    ),
  );
  return rows;
}

async function queueTrack(
  artist: string,
  title: string,
  ctx: ContextAdapter,
): Promise<string | null> {
  const api = getMusicApi();
  if (!api.isConfigured()) return '❌ Music server chưa cấu hình.';
  const vc = ctx.voiceChannel;
  if (!vc) return '❌ Vào kênh thoại trước.';
  const resolved = await api.searchAndResolve(`${artist} ${title}`);
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
  return null;
}

const spotify: ActionCommand = {
  name: 'spotify',
  description: 'Menu Spotify CLI — playlist, nghệ sĩ, gợi ý, tìm kiếm',
  category: 'music',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    const loggedIn = prisma
      ? !!(await prisma.client.spotifyToken.findUnique({
          where: { userId: ctx.userId },
        }))
      : false;
    const avatar = ctx.author.displayAvatarURL();
    const msg = await ctx.reply({
      embeds: [mainEmbed(ctx.author.username, loggedIn)],
      components: mainRows(loggedIn),
    });

    function refreshCollector(m: typeof msg) {
      const col = m.createMessageComponentCollector({ time: 180_000 });
      col.on('collect', async (i) => {
        if (i.user.id !== ctx.userId) {
          await i.reply({ content: '❌', flags: 64 });
          return;
        }
        const cid = i.customId;

        if (cid === 'spot_search') {
          await i.reply({
            content: '🔍 Dùng `/spotify_search` hoặc `/spotify_playlist`.',
            flags: 64,
          });
          return;
        }
        if (cid === 'spot_login') {
          await i.reply({ content: '🔐 Dùng `/spotify_login`.', flags: 64 });
          return;
        }
        if (cid === 'spot_logout') {
          await i.reply({ content: '🔓 Dùng `/spotify_logout`.', flags: 64 });
          return;
        }
        if (cid === 'spot_back') {
          await i.update({
            embeds: [mainEmbed(ctx.author.username, loggedIn)],
            components: mainRows(loggedIn),
          });
          col.stop();
          refreshCollector(msg);
          return;
        }

        if (!prisma) {
          await i.reply({ content: '❌ Hệ thống chưa sẵn sàng.', flags: 64 });
          return;
        }
        const token =
          cid === 'spot_browse'
            ? null
            : await getAccessToken(ctx.userId, prisma);
        if (!token && cid !== 'spot_browse') {
          await i.reply({
            content: '🔐 Cần đăng nhập Spotify! `/spotify_login`',
            flags: 64,
          });
          return;
        }

        await i.deferUpdate();
        try {
          // ── My Playlists ──
          if (cid === 'spot_my') {
            const d = await spotifyGet(token!, '/me/playlists?limit=25');
            const pls = (d.items || []).map((p: any) => ({
              name: p.name,
              tracks: p.tracks?.total || 0,
              url: p.external_urls?.spotify || '',
            }));
            const emb = new EmbedBuilder()
              .setColor(0x1db954)
              .setAuthor({ name: '📚 Playlist của bạn', iconURL: avatar })
              .setDescription(
                pls.length
                  ? pls
                      .map(
                        (p: any, idx: number) =>
                          `**${idx + 1}.** [${p.name}](${p.url}) — ${p.tracks} bài`,
                      )
                      .join('\n')
                  : 'Chưa có playlist.',
              )
              .setFooter({
                text: pls.length
                  ? 'Dùng /spotify_playlist query:link để phát'
                  : '',
              });
            await i.editReply({
              embeds: [emb],
              components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn()),
              ],
            });
            col.stop();
            refreshCollector(msg);
          }
          // ── Made For You / Featured Playlists ──
          else if (cid === 'spot_made') {
            const d = await spotifyGet(
              token!,
              '/browse/featured-playlists?limit=20&country=VN',
            );
            const made = d.playlists?.items || [];
            if (!made.length) {
              await i.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('✨ Featured Playlists')
                    .setDescription('Không tìm thấy playlist nổi bật nào.'),
                ],
                components: [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    backBtn(),
                  ),
                ],
              });
            } else {
              const emb = new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle(`✨ ${d.message || 'Featured Playlists'}`)
                .setDescription(
                  made
                    .slice(0, 15)
                    .map(
                      (p: any, i: number) =>
                        `**${i + 1}.** [${p.name}](${p.external_urls?.spotify || ''}) — ${p.tracks?.total || 0} bài\n> ${p.description?.slice(0, 60) || ''}`,
                    )
                    .join('\n'),
                )
                .setFooter({
                  text: 'Dùng /spotify_playlist query:link để phát',
                });
              await i.editReply({
                embeds: [emb],
                components: [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    backBtn(),
                  ),
                ],
              });
            }
            col.stop();
            refreshCollector(msg);
          }
          // ── Top Artists ──
          else if (cid === 'spot_artists') {
            const d = await spotifyGet(
              token!,
              '/me/top/artists?limit=15&time_range=medium_term',
            );
            const artists = (d.items || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              genres: (a.genres || []).slice(0, 3).join(', '),
              image: a.images?.[1]?.url,
            }));
            const emb = new EmbedBuilder()
              .setColor(0x1db954)
              .setAuthor({ name: '🎤 Top Artists', iconURL: avatar })
              .setDescription(
                artists
                  .map(
                    (a: any, i: number) =>
                      `**${i + 1}.** ${a.name} — ${a.genres || 'N/A'}`,
                  )
                  .join('\n'),
              )
              .setFooter({ text: 'Chọn nghệ sĩ để xem chi tiết' });
            const sel = new StringSelectMenuBuilder()
              .setCustomId('spot_artist_sel')
              .setPlaceholder('Chọn nghệ sĩ...');
            artists.forEach((a: any) =>
              sel.addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel(a.name)
                  .setValue(a.id)
                  .setDescription(a.genres || ''),
              ),
            );
            await i.editReply({
              embeds: [emb],
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                  sel,
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn()),
              ],
            });
            col.stop();
            refreshCollector(msg);
          }
          // ── Artist Detail ──
          else if (cid === 'spot_artist_sel') {
            const aid = (i as any).values?.[0];
            if (!aid) return;
            const [artist, top] = await Promise.all([
              spotifyGet(token!, `/artists/${aid}`),
              spotifyGet(
                token!,
                `/artists/${aid}/top-tracks?market=VN&limit=10`,
              ),
            ]);
            const tracks = (top.tracks || []).map((t: any) => ({
              id: t.id,
              name: t.name,
              album: t.album?.name,
              duration: Math.round(t.duration_ms / 1000),
              explicit: t.explicit,
            }));
            const emb = new EmbedBuilder()
              .setColor(0x1db954)
              .setAuthor({
                name: artist.name,
                iconURL: avatar,
                url: artist.external_urls?.spotify,
              })
              .setThumbnail(artist.images?.[0]?.url)
              .addFields(
                {
                  name: '🎵 Thể loại',
                  value: (artist.genres || []).slice(0, 5).join(', ') || 'N/A',
                },
                {
                  name: '👥 Followers',
                  value: artist.followers?.total?.toLocaleString() || 'N/A',
                  inline: true,
                },
                {
                  name: '⭐ Popularity',
                  value: `${artist.popularity || '?'}/100`,
                  inline: true,
                },
              )
              .setDescription(
                `**Top Tracks:**\n${tracks.map((t: any, idx: number) => `**${idx + 1}.** ${t.name} ${t.explicit ? '🅴' : ''} — ${formatDuration(t.duration)}`).join('\n')}`,
              )
              .setFooter({ text: 'Chọn bài để phát' });
            const tSel = new StringSelectMenuBuilder()
              .setCustomId('spot_artist_track_sel')
              .setPlaceholder('Chọn bài để phát...');
            tracks.forEach((t: any) =>
              tSel.addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel(t.name)
                  .setValue(t.id)
                  .setDescription(
                    `${t.album || ''} • ${formatDuration(t.duration)}`,
                  ),
              ),
            );
            await i.editReply({
              embeds: [emb],
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                  tSel,
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                  backBtn('artists'),
                ),
              ],
            });
            col.stop();
            refreshCollector(msg);
          }
          // ── Back from artist ──
          else if (cid === 'spot_back_artists') {
            const d = await spotifyGet(
              token!,
              '/me/top/artists?limit=15&time_range=medium_term',
            );
            const artists = (d.items || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              genres: (a.genres || []).slice(0, 3).join(', '),
            }));
            const emb = new EmbedBuilder()
              .setColor(0x1db954)
              .setAuthor({ name: '🎤 Top Artists', iconURL: avatar })
              .setDescription(
                artists
                  .map(
                    (a: any, i: number) =>
                      `**${i + 1}.** ${a.name} — ${a.genres || 'N/A'}`,
                  )
                  .join('\n'),
              )
              .setFooter({ text: 'Chọn nghệ sĩ để xem chi tiết' });
            const sel = new StringSelectMenuBuilder()
              .setCustomId('spot_artist_sel')
              .setPlaceholder('Chọn nghệ sĩ...');
            artists.forEach((a: any) =>
              sel.addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel(a.name)
                  .setValue(a.id)
                  .setDescription(a.genres || ''),
              ),
            );
            await i.editReply({
              embeds: [emb],
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                  sel,
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn()),
              ],
            });
            col.stop();
            refreshCollector(msg);
          }
          // ── Play track from artist ──
          else if (cid === 'spot_artist_track_sel') {
            const tid = (i as any).values?.[0];
            const tdata = await spotifyGet(token!, `/tracks/${tid}`);
            const err = await queueTrack(
              tdata.artists?.[0]?.name || '',
              tdata.name,
              ctx,
            );
            if (err) {
              await i.editReply({
                embeds: [new EmbedBuilder().setColor(0xef4444).setTitle(err)],
                components: [],
              });
            } else {
              await i.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('🎧 Đã thêm')
                    .setThumbnail(tdata.album?.images?.[1]?.url)
                    .setDescription(
                      `**${tdata.artists?.[0]?.name || ''} — ${tdata.name}**\n⏱ ${formatDuration(Math.round(tdata.duration_ms / 1000))}`,
                    ),
                ],
                components: [],
              });
            }
          }
          // ── Recently Played (Vừa nghe) ──
          else if (cid === 'spot_recs') {
            const d = await spotifyGet(
              token!,
              '/me/player/recently-played?limit=25',
            );

            const tracks = (d.items || []).map((item: any) => ({
              id: item.track.id,
              artist: item.track.artists?.[0]?.name || '???',
              title: item.track.name,
              album: item.track.album?.name,
              image: item.track.album?.images?.[2]?.url,
              duration: Math.round(item.track.duration_ms / 1000),
            }));

            const uniqueTracks = tracks
              .filter(
                (t: any, idx: number, arr: any[]) =>
                  arr.findIndex((item) => item.id === t.id) === idx,
              )
              .slice(0, 10);

            if (!uniqueTracks.length) {
              await i.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('🔂 Vừa nghe gần đây')
                    .setDescription('Bạn chưa nghe bài nào gần đây.'),
                ],
                components: [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    backBtn(),
                  ),
                ],
              });
              col.stop();
              refreshCollector(msg);
              return;
            }

            const emb = new EmbedBuilder()
              .setColor(0x1db954)
              .setTitle('🔂 Vừa nghe gần đây')
              .setDescription(
                uniqueTracks
                  .map(
                    (t: any, idx: number) =>
                      `**${idx + 1}.** **${t.artist}** — ${t.title.slice(0, 40)}`,
                  )
                  .join('\n'),
              )
              .setFooter({ text: 'Chọn bài để phát' });

            const rSel = new StringSelectMenuBuilder()
              .setCustomId('spot_recs_sel')
              .setPlaceholder('Chọn bài...');
            uniqueTracks.forEach((t: any) =>
              rSel.addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel(`${t.artist} — ${t.title}`.slice(0, 100))
                  .setValue(t.id)
                  .setDescription(t.album?.slice(0, 50) || ''),
              ),
            );

            await i.editReply({
              embeds: [emb],
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                  rSel,
                ),
                new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn()),
              ],
            });
            col.stop();
            refreshCollector(msg);
          }
          // ── Play from recs ──
          else if (cid === 'spot_recs_sel') {
            const tid = (i as any).values?.[0];
            const tdata = await spotifyGet(token!, `/tracks/${tid}`);
            const err = await queueTrack(
              tdata.artists?.[0]?.name || '',
              tdata.name,
              ctx,
            );
            if (err) {
              await i.editReply({
                embeds: [new EmbedBuilder().setColor(0xef4444).setTitle(err)],
                components: [],
              });
            } else {
              await i.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('🎧 Đã thêm')
                    .setThumbnail(tdata.album?.images?.[1]?.url)
                    .setDescription(
                      `**${tdata.artists?.[0]?.name || ''} — ${tdata.name}**\n⏱ ${formatDuration(Math.round(tdata.duration_ms / 1000))}`,
                    ),
                ],
                components: [],
              });
            }
          }
          // ── Browse Featured ──
          else if (cid === 'spot_browse') {
            const ct = await getClientToken();
            if (!ct) {
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
            const d = await spotifyGet(
              ct,
              '/search?q=top+hits&type=playlist&limit=10',
            );
            const pls = (d.playlists?.items || []).map((p: any) => ({
              name: p.name,
              tracks: p.tracks?.total || 0,
              url: p.external_urls?.spotify || '',
              desc: p.description?.slice(0, 80) || '',
            }));
            const emb = new EmbedBuilder()
              .setColor(0x1db954)
              .setTitle('📖 Featured Playlists')
              .setDescription(
                pls
                  .map(
                    (p: any, i: number) =>
                      `**${i + 1}.** [${p.name}](${p.url}) — ${p.tracks} bài\n> ${p.desc}`,
                  )
                  .join('\n'),
              )
              .setFooter({ text: 'Dùng /spotify_playlist query:link để phát' });
            await i.editReply({
              embeds: [emb],
              components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn()),
              ],
            });
            col.stop();
            refreshCollector(msg);
          }
        } catch (e: any) {
          if (e.message === 'SPOTIFY_AUTH')
            await i.editReply({ embeds: [authErrEmbed()], components: [] });
          else
            await i.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xef4444)
                  .setDescription(`❌ Lỗi: ${e.message}`),
              ],
              components: [],
            });
        }
      });
      col.on('end', async () => {
        try {
          await msg.edit({ components: [] }).catch(() => {});
        } catch {
          /* */
        }
      });
    }
    refreshCollector(msg);
  },
};

export default spotify;
