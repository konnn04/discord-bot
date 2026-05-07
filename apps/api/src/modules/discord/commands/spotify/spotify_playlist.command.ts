import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import {
  getMusicApi,
  type MusicTrack,
} from '../../services/music/music-api.client';
import {
  getQueueManager,
  type QueueTrack,
} from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { isUrl, formatDuration } from '../../services/music/utils';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} from 'discord.js';

const PAGE_SIZE = 10;

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

      // Search tracks — user picks one to play
      const results = await api.search(query, 'spotify', 20);
      if (results.length === 0) {
        await ctx.editReply('❌ Không tìm thấy.');
        return;
      }

      const pages = Math.ceil(results.length / PAGE_SIZE);
      let page = 1;
      const slice = () =>
        results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

      const buildEmbed = () => {
        const lines = slice().map((t, i) => {
          const num = (page - 1) * PAGE_SIZE + i + 1;
          const dur = t.duration ? ` • ${formatDuration(t.duration)}` : '';
          return `**${num}.** **${t.artist || '???'}** — ${t.title.slice(0, 45)}${dur}`;
        });
        return new EmbedBuilder()
          .setColor(0x1db954)
          .setTitle(`🎧 Spotify: "${query.slice(0, 30)}"`)
          .setDescription(lines.join('\n'))
          .setFooter({
            text: `Trang ${page}/${pages} • Chọn bài để thêm vào queue`,
          });
      };

      const buildSelect = () => {
        const s = new StringSelectMenuBuilder()
          .setCustomId('spl_sel')
          .setPlaceholder('Chọn bài để phát...');
        slice().forEach((t) =>
          s.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(`${t.artist || '???'} — ${t.title}`.slice(0, 100))
              .setValue(t.sourceId)
              .setDescription(t.duration ? formatDuration(t.duration) : ''),
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
          else if (i.customId === 'spl_playnow') {
            const vc = ctx.voiceChannel;
            if (!vc) {
              await i.reply({
                content: '❌ Bạn cần vào kênh thoại.',
                flags: 64,
              });
              return;
            }
            const pm = getPlayerManager();
            pm.join(vc);
            void pm.playWithAutoSkip(ctx.guildId!, ctx.client);
            await i.update({ components: [] });
            return;
          } else if (i.customId === 'spl_sel') {
            const sourceId = (i as any).values?.[0];
            const track = results.find((t) => t.sourceId === sourceId);
            if (track) {
              const qm = getQueueManager();
              const pm = getPlayerManager();
              const guildId = ctx.guildId!;
              const qt: QueueTrack = {
                track,
                youtubeId: undefined,
                requestedBy: ctx.author.username,
                requestedById: ctx.userId,
              };
              const beforeCount = qm.get(guildId)?.tracks.length || 0;
              qm.addTrack(guildId, ctx.channelId!, qt);
              if (!beforeCount) {
                const q = qm.get(guildId)!;
                q.current = 0;
                pm.join(vc);
                void pm.playWithAutoSkip(guildId, ctx.client);
              }
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x1db954)
                    .setAuthor({ name: '🎧 Đã thêm vào hàng chờ' })
                    .setTitle(`${track.artist || '???'} — ${track.title}`)
                    .setThumbnail(track.thumbnail)
                    .setURL(track.url)
                    .setDescription(
                      `⏱ ${formatDuration(track.duration)}${beforeCount > 0 ? `\n📋 Vị trí #${beforeCount + 1} trong queue` : '\n▶️ Đang phát ngay'}`,
                    ),
                ],
                components:
                  beforeCount > 0
                    ? [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                          new ButtonBuilder()
                            .setCustomId('spl_playnow')
                            .setEmoji('▶️')
                            .setLabel('Phát ngay')
                            .setStyle(ButtonStyle.Success),
                        ),
                      ]
                    : [],
              });
              return;
            }
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
