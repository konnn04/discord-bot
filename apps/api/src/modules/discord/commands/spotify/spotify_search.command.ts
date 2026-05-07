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
import { formatDuration } from '../../services/music/utils';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const PAGE_SIZE = 10;

function listEmbed(
  tracks: MusicTrack[],
  page: number,
  totalPages: number,
  query: string,
): EmbedBuilder {
  const lines = tracks.map((t, i) => {
    const num = (page - 1) * PAGE_SIZE + i + 1;
    const dur = t.duration ? ` • ${formatDuration(t.duration)}` : '';
    return `**${num}.** **${t.artist || '???'}** — ${t.title.slice(0, 45)}${dur}`;
  });
  return new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle(`🎧 Spotify: "${query.slice(0, 30)}"`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Trang ${page}/${totalPages} • Chọn bài để phát` });
}

function pageButtons(
  page: number,
  totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('sp_page_first')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('sp_page_prev')
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('sp_page_next')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId('sp_page_last')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId('sp_refine')
      .setEmoji('✏️')
      .setLabel('Tìm lại')
      .setStyle(ButtonStyle.Secondary),
  );
}

function selectMenu(
  tracks: MusicTrack[],
): ActionRowBuilder<StringSelectMenuBuilder> {
  const s = new StringSelectMenuBuilder()
    .setCustomId('sp_select')
    .setPlaceholder('Chọn bài để phát...');
  for (const t of tracks) {
    s.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${t.artist || '???'} — ${t.title}`.slice(0, 100))
        .setValue(t.sourceId)
        .setDescription(t.duration ? formatDuration(t.duration) : 'N/A'),
    );
  }
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(s);
}

const spotifySearch: ActionCommand = {
  name: 'spotify_search',
  description: 'Tìm kiếm nhạc trên Spotify & phát luôn',
  category: 'music',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'query',
      description: 'Từ khóa tìm kiếm',
      type: 'STRING',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const query = (ctx.getOption('query', 'string') as string) || '';
    if (!query) {
      await ctx.reply('❌ Nhập từ khóa.');
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

    const allTracks = await api.search(query, 'spotify', 30);
    if (allTracks.length === 0) {
      await ctx.editReply('❌ Không tìm thấy.');
      return;
    }

    let totalPages = Math.ceil(allTracks.length / PAGE_SIZE);
    let page = 1;

    const slice = () =>
      allTracks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const msg = await ctx.editReply({
      embeds: [listEmbed(slice(), page, totalPages, query)],
      components: [selectMenu(slice()), pageButtons(page, totalPages)],
    });

    const attachCollector = (message: typeof msg) => {
      const col = message.createMessageComponentCollector({ time: 120_000 });

      col.on('collect', async (i) => {
        if (i.user.id !== ctx.userId) {
          await i.reply({ content: '❌', flags: 64 });
          return;
        }
        const cid = i.customId;

        if (
          cid.startsWith('sp_page_') ||
          cid === 'sp_page_first' ||
          cid === 'sp_page_last'
        ) {
          if (cid === 'sp_page_first') page = 1;
          else if (cid === 'sp_page_last') page = totalPages;
          else if (cid === 'sp_page_prev') page--;
          else if (cid === 'sp_page_next') page++;
          await i.update({
            embeds: [listEmbed(slice(), page, totalPages, query)],
            components: [selectMenu(slice()), pageButtons(page, totalPages)],
          });
          col.stop();
          attachCollector(msg);
          return;
        }

        // ── Live search refine: open modal → re-search ──
        if (cid === 'sp_refine') {
          const modal = new ModalBuilder()
            .setCustomId('sp_refine_modal')
            .setTitle('Tìm kiếm Spotify');
          const input = new TextInputBuilder()
            .setCustomId('sp_query')
            .setLabel('Từ khóa')
            .setStyle(TextInputStyle.Short)
            .setValue(query)
            .setMaxLength(100);
          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(input),
          );
          await i.showModal(modal);

          const submitted = await i
            .awaitModalSubmit({ time: 60_000 })
            .catch(() => null);
          if (submitted) {
            const newQuery = submitted.fields.getTextInputValue('sp_query');
            if (!newQuery) return;
            await submitted.deferUpdate();
            const newResults = await api.search(newQuery, 'spotify', 30);
            if (newResults.length === 0) {
              await submitted.editReply({ content: '❌ Không tìm thấy.' });
              return;
            }
            allTracks.length = 0;
            allTracks.push(...newResults);
            totalPages = Math.ceil(allTracks.length / PAGE_SIZE);
            page = 1;
            await submitted.editReply({
              embeds: [listEmbed(slice(), page, totalPages, newQuery)],
              components: [selectMenu(slice()), pageButtons(page, totalPages)],
            });
          }
          return;
        }

        if (cid === 'sp_select') {
          const sourceId = (i as any).values?.[0];
          if (!sourceId) return;

          const track = allTracks.find((t) => t.sourceId === sourceId);
          if (!track) return;

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

          const wasEmpty = !qm.getCurrent(guildId);
          if (wasEmpty) {
            const q = qm.get(guildId)!;
            q.current = q.tracks.length - 1;
            pm.join(vc);
            void pm.playWithAutoSkip(guildId, ctx.client);
          }

          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x1db954)
                .setAuthor({ name: '🎧 Đã thêm vào queue' })
                .setTitle(track.title)
                .setURL(track.url)
                .setDescription(
                  `**${track.artist || 'Không rõ'}**\n⏱ ${formatDuration(track.duration)}`,
                ),
            ],
            components: wasEmpty
              ? []
              : [
                  new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                      .setCustomId('sp_playnow')
                      .setEmoji('▶️')
                      .setLabel('Phát ngay')
                      .setStyle(ButtonStyle.Success),
                  ),
                ],
          });
          return;
        }

        if (cid === 'sp_playnow') {
          const vc = ctx.voiceChannel;
          if (!vc) {
            await i.reply({ content: '❌ Bạn cần vào kênh thoại.', flags: 64 });
            return;
          }
          const pm = getPlayerManager();
          pm.join(vc);
          void pm.playWithAutoSkip(ctx.guildId!, ctx.client);
          await i.update({ components: [] });
          return;
        }
      });

      col.on('end', async () => {
        try {
          await msg.edit({ components: [] }).catch(() => {});
        } catch {
          /* */
        }
      });
    };

    attachCollector(msg);
  },
};

export default spotifySearch;
