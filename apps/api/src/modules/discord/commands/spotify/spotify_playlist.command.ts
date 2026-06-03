import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import {
  getMusicApi,
} from '../../services/music/music-api.client';
import type { MusicTrack, QueueTrack } from 'shared/src/types/music.types';
import {
  getQueueManager,
} from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { isUrl } from '../../services/music/utils';
import { PAGE_SIZE } from '../../constants';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} from 'discord.js';

function afterAddEmbed(
  playlistName: string,
  thumbnail: string | undefined,
  total: number,
  preview: MusicTrack[],
): EmbedBuilder {
  const previewLines = preview
    .slice(0, 5)
    .map(
      (t, i) => `**${i + 1}.** ${t.artist || '???'} — ${t.title.slice(0, 45)}`,
    );
  return new EmbedBuilder()
    .setColor(0x1db954)
    .setAuthor({ name: '🎧 Đã thêm vào hàng chờ' })
    .setTitle(playlistName)
    .setThumbnail(thumbnail || null)
    .setDescription(
      `📋 **${total}** bài đã được thêm.\n\n` +
        (previewLines.length > 0
          ? `**Xem trước:**\n${previewLines.join('\n')}\n`
          : '') +
        (total > 5 ? `\n*...và ${total - 5} bài khác*` : ''),
    );
}

const spotifyPlaylist: ActionCommand = {
  name: 'spotify_playlist',
  description: 'Mở playlist Spotify bằng link hoặc tìm kiếm & phát',
  category: 'music',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'query',
      description: 'Link playlist Spotify hoặc từ khóa',
      type: 'STRING',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const query = (ctx.getOption('query', 'string') as string) || '';
    if (!query) {
      await ctx.reply('❌ Nhập link hoặc từ khóa.');
      return;
    }

    const api = getMusicApi();
    if (!api.isConfigured()) {
      await ctx.reply('❌ Music server chưa cấu hình.');
      return;
    }

    const vc = ctx.voiceChannel;
    if (!vc) {
      await ctx.reply('❌ Bạn cần vào kênh thoại.');
      return;
    }

    await ctx.defer();

    try {
      if (isUrl(query)) {
        const parsed = await api.parseUrl(query, 'playlist');
        const items: MusicTrack[] = Array.isArray(parsed.data)
          ? parsed.data
          : (parsed.data as any)?.tracks || [];
        if (items.length === 0) {
          await ctx.editReply('❌ Playlist trống.');
          return;
        }

        const limited = items.slice(0, 50);
        const qm = getQueueManager();
        const pm = getPlayerManager();
        const guildId = ctx.guildId!;

        const tracks: QueueTrack[] = limited.map((t) => ({
          track: t,
          youtubeId: t.source === 'youtube' ? t.sourceId : undefined,
          requestedBy: ctx.author.username,
          requestedById: ctx.userId,
        }));

        const wasEmpty = !qm.getCurrent(guildId);
        qm.addTracks(guildId, ctx.channelId!, tracks);

        if (wasEmpty) {
          const q = qm.get(guildId)!;
          q.current = q.tracks.length - tracks.length;
          pm.join(vc);
          void pm.playWithAutoSkip(guildId, ctx.client);
        }

        const name = (parsed.data as any)?.name || 'Playlist Spotify';
        const thumb = limited[0]?.thumbnail;
        await ctx.editReply({
          embeds: [afterAddEmbed(name, thumb, tracks.length, limited)],
        });
        return;
      }

      // Search SPOTIFY PLAYLISTS (not tracks!) using client credentials
      const cId = process.env.SPOTIFY_CLIENT_ID;
      const cSec = process.env.SPOTIFY_CLIENT_SECRET;
      if (!cId || !cSec) {
        await ctx.editReply(
          '❌ Spotify chưa được cấu hình (thiếu SPOTIFY_CLIENT_ID/SECRET).',
        );
        return;
      }

      const authRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' + Buffer.from(`${cId}:${cSec}`).toString('base64'),
        },
        body: 'grant_type=client_credentials',
      });
      const auth = await authRes.json();
      if (!auth.access_token) {
        await ctx.editReply('❌ Không thể xác thực Spotify.');
        return;
      }

      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=20`,
        { headers: { Authorization: `Bearer ${auth.access_token}` } },
      );
      const searchData = await searchRes.json();
      const playlists: any[] = searchData.playlists?.items || [];

      if (playlists.length === 0) {
        await ctx.editReply('❌ Không tìm thấy playlist nào.');
        return;
      }

      const plList = playlists.map((p: any) => ({
        id: p.id,
        name: p.name,
        tracks: p.tracks?.total || 0,
        url: p.external_urls?.spotify || '',
        image: p.images?.[0]?.url,
        owner: p.owner?.display_name,
        desc: p.description?.slice(0, 80) || '',
      }));

      const pages = Math.ceil(plList.length / PAGE_SIZE);
      let page = 1;
      const slice = () =>
        plList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

      const buildEmbed = () => {
        const lines = slice().map((p, i) => {
          const num = (page - 1) * PAGE_SIZE + i + 1;
          return `**${num}.** [${p.name}](${p.url}) — ${p.tracks} bài\n> ${p.owner ? `bởi ${p.owner} • ` : ''}${p.desc || 'Không có mô tả'}`;
        });
        return new EmbedBuilder()
          .setColor(0x1db954)
          .setTitle(`📋 Playlist Spotify: "${query.slice(0, 30)}"`)
          .setDescription(lines.join('\n'))
          .setFooter({
            text: `Trang ${page}/${pages} • Chọn playlist để thêm tất cả bài vào queue`,
          });
      };

      const buildSelect = () => {
        const s = new StringSelectMenuBuilder()
          .setCustomId('spl_sel')
          .setPlaceholder('Chọn playlist...');
        slice().forEach((p: any) =>
          s.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(p.name.slice(0, 100))
              .setValue(p.id)
              .setDescription(`${p.tracks} bài • ${p.owner || 'Spotify'}`),
          ),
        );
        return s;
      };

      const buildBtns = () =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('spl_prev')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId('spl_next')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= pages),
        );

      const msg = await ctx.editReply({
        embeds: [buildEmbed()],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            buildSelect(),
          ),
          buildBtns(),
        ],
      });

      const attach = (m: typeof msg) => {
        const col = m.createMessageComponentCollector({ time: 120_000 });
        col.on('collect', async (i) => {
          if (i.user.id !== ctx.userId) {
            await i.reply({ content: '❌', flags: 64 });
            return;
          }
          if (i.customId === 'spl_prev') page--;
          else if (i.customId === 'spl_next') page++;
          else if (i.customId === 'spl_sel') {
            const plId = (i as any).values?.[0];
            const pl = plList.find((p: any) => p.id === plId);
            if (!pl) return;

            await i.deferUpdate();

            // Fetch playlist tracks via music server
            const parsed = await api.parseUrl(pl.url, 'playlist');
            const items: MusicTrack[] = Array.isArray(parsed.data)
              ? parsed.data
              : (parsed.data as any)?.tracks || [];
            if (items.length === 0) {
              await i.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0xef4444)
                    .setTitle('❌ Playlist trống hoặc không truy cập được.'),
                ],
                components: [],
              });
              return;
            }

            const limited = items.slice(0, 50);
            const qm = getQueueManager();
            const pm = getPlayerManager();
            const guildId = ctx.guildId!;
            const tracks: QueueTrack[] = limited.map((t) => ({
              track: t,
              youtubeId: t.source === 'youtube' ? t.sourceId : undefined,
              requestedBy: ctx.author.username,
              requestedById: ctx.userId,
            }));
            const wasEmpty = !qm.getCurrent(guildId);
            qm.addTracks(guildId, ctx.channelId!, tracks);
            if (wasEmpty) {
              const q = qm.get(guildId)!;
              q.current = q.tracks.length - tracks.length;
              pm.join(vc);
              void pm.playWithAutoSkip(guildId, ctx.client);
            }

            await i.editReply({
              embeds: [
                afterAddEmbed(pl.name, pl.image, tracks.length, limited),
              ],
            });
            return;
          }

          await i.update({
            embeds: [buildEmbed()],
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                buildSelect(),
              ),
              buildBtns(),
            ],
          });
          col.stop();
          attach(msg);
        });
      };
      attach(msg);
    } catch (err: any) {
      await ctx.editReply(`❌ Lỗi: ${err.message}`);
    }
  },
};

export default spotifyPlaylist;
