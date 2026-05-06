import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';

const myAnime: ActionCommand = {
  name: 'my_anime',
  description: 'Xem danh sách anime bạn đang theo dõi',
  category: 'anime',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    await ctx.defer();

    const tracks = await prisma.client.animeTrack.findMany({
      where: { userId: ctx.userId },
      orderBy: { addedAt: 'desc' },
    });

    if (tracks.length === 0) {
      await ctx.editReply(
        '📭 Bạn chưa theo dõi anime nào. Dùng `/anime` để bắt đầu!',
      );
      return;
    }

    const embeds: EmbedBuilder[] = [];
    for (const t of tracks) {
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(t.title)
        .setThumbnail(t.posterUrl)
        .addFields(
          {
            name: 'Số tập',
            value: t.episodeCount ? `${t.episodeCount}` : 'Chưa rõ',
            inline: true,
          },
          {
            name: 'Tập tiếp theo',
            value: t.nextEpisode
              ? `Ep ${t.nextEpisode}${t.airingAt ? ` — <t:${Math.floor(t.airingAt.getTime() / 1000)}:R>` : ''}`
              : 'Đã kết thúc',
            inline: true,
          },
        );

      const unfollowBtn = new ButtonBuilder()
        .setCustomId(`anime_unfollow_${t.animeId}`)
        .setLabel('Bỏ theo dõi')
        .setStyle(ButtonStyle.Danger);

      embeds.push(embed);

      const msg = await ctx.editReply({
        embeds: [embed],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(unfollowBtn),
        ],
      });

      // Only handle first embed with button (Discord limits)
      if (embeds.length === 1) {
        const collector = msg.createMessageComponentCollector({ time: 60_000 });
        collector.on('collect', async (i) => {
          if (i.user.id !== ctx.userId) {
            await i.reply({
              content: '❌ Nút này không dành cho bạn.',
              flags: 64,
            });
            return;
          }
          const animeId = parseInt(
            i.customId.replace('anime_unfollow_', ''),
            10,
          );
          await prisma.client.animeTrack.delete({
            where: { userId_animeId: { userId: ctx.userId, animeId } },
          });
          await i.update({
            embeds: [embed.setFooter({ text: '❌ Đã bỏ theo dõi' })],
            components: [],
          });
        });
        break; // Discord only supports 1 active collector per message
      }
    }
  },
};

export default myAnime;
