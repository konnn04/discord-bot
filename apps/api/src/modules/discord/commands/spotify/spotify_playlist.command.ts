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
import { isUrl } from '../../services/music/utils';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} from 'discord.js';

const PAGE_SIZE = 10;

const spotifyPlaylist: ActionCommand = {
  name: 'spotify_playlist',
  description: 'Tìm playlist Spotify hoặc mở bằng link và phát',
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
        // Parse URL
        const parsed = await api.parseUrl(query, 'playlist');
        const items = Array.isArray(parsed.data)
          ? parsed.data
          : (parsed.data as any)?.tracks || [];
        if (items.length === 0) {
          await ctx.editReply('❌ Playlist trống.');
          return;
        }

        const limited = items.slice(0, 50) as MusicTrack[];
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

        const name = (parsed.data as any)?.name || 'Playlist';
        await ctx.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x1db954)
              .setAuthor({ name: '🎧 Đã thêm playlist' })
              .setTitle(name)
              .setDescription(`Đã thêm ${tracks.length} bài vào queue.`),
          ],
        });
        return;
      }

      // Search playlists via parseUrl (music server can handle keyword→playlist search)
      // Fallback: search tracks and show as "playlist-like" results
      const results = await api.search(query, 'spotify', 20);
      if (results.length === 0) {
        await ctx.editReply('❌ Không tìm thấy.');
        return;
      }

      // Show as track results — user can pick one to play
      const pages = Math.ceil(results.length / PAGE_SIZE);
      let page = 1;
      const slice = () =>
        results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle(`🎧 Spotify: "${query.slice(0, 30)}"`)
        .setDescription(
          slice()
            .map(
              (t, i) =>
                `**${(page - 1) * PAGE_SIZE + i + 1}.** **${t.artist || '???'}** — ${t.title.slice(0, 45)}`,
            )
            .join('\n'),
        )
        .setFooter({ text: `Trang ${page}/${pages}` });

      const sel = new StringSelectMenuBuilder()
        .setCustomId('spl_sel')
        .setPlaceholder('Chọn bài...');
      slice().forEach((t) =>
        sel.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${t.artist || '???'} — ${t.title}`.slice(0, 100))
            .setValue(t.sourceId),
        ),
      );
      const btns = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
        embeds: [embed],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(sel),
          btns,
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
              qm.addTrack(guildId, ctx.channelId!, qt);
              if (!qm.getCurrent(guildId)) {
                const q = qm.get(guildId)!;
                q.current = q.tracks.length - 1;
                pm.join(vc);
                void pm.playWithAutoSkip(guildId, ctx.client);
              }
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x1db954)
                    .setTitle('🎧 Đã thêm')
                    .setDescription(`**${track.artist} — ${track.title}**`),
                ],
                components: [],
              });
              return;
            }
          }
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1db954)
                .setTitle(`Trang ${page}`)
                .setDescription(
                  slice()
                    .map(
                      (t, i) =>
                        `**${(page - 1) * PAGE_SIZE + i + 1}.** ${t.artist} — ${t.title.slice(0, 45)}`,
                    )
                    .join('\n'),
                ),
            ],
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId('spl_sel')
                  .setPlaceholder('Chọn...')
                  .addOptions(
                    slice().map((t: MusicTrack) =>
                      new StringSelectMenuOptionBuilder()
                        .setLabel(
                          `${t.artist || '???'} — ${t.title}`.slice(0, 100),
                        )
                        .setValue(t.sourceId),
                    ),
                  ),
              ),
              btns,
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
