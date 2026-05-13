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

type StalkModes = {
  onOnline: boolean;
  onVoice: boolean;
  onGame: boolean;
  onMessage: boolean;
};

const MODE_DEFS = [
  {
    key: 'onOnline',
    emoji: '🟢',
    label: 'Online',
    desc: 'Thông báo khi online',
  },
  {
    key: 'onVoice',
    emoji: '🔊',
    label: 'Voice',
    desc: 'Thông báo khi vào kênh voice',
  },
  { key: 'onGame', emoji: '🎮', label: 'Game', desc: 'Thông báo khi đổi game' },
  {
    key: 'onMessage',
    emoji: '💬',
    label: 'Message',
    desc: 'Thông báo khi nhắn tin',
  },
] as const;

function modeButtons(modes: StalkModes): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...MODE_DEFS.map((m) => {
      const on = modes[m.key];
      return new ButtonBuilder()
        .setCustomId(`stalk_${m.key}`)
        .setEmoji(m.emoji)
        .setStyle(on ? ButtonStyle.Success : ButtonStyle.Secondary);
    }),
    new ButtonBuilder()
      .setCustomId('stalk_clear')
      .setEmoji('🗑️')
      .setLabel('Bỏ theo dõi')
      .setStyle(ButtonStyle.Danger),
  );
}

function statusEmbed(
  targetTag: string,
  modes: StalkModes,
  guildName: string,
): EmbedBuilder {
  const lines = MODE_DEFS.map((m) => {
    const on = modes[m.key];
    return `${on ? '✅' : '❌'} ${m.emoji} **${m.label}**: ${m.desc}`;
  });

  return new EmbedBuilder()
    .setColor(0xf43f5e)
    .setTitle('👀 Theo dõi')
    .setDescription(
      `Đang theo dõi **${targetTag}** tại **${guildName}**\n\n` +
        lines.join('\n') +
        '\n\n*Bấm nút bên dưới để bật/tắt từng chế độ*\n' +
        '*Theo dõi hoạt động ở mọi server bot có thể thấy*',
    );
}

const stalk: ActionCommand = {
  name: 'stalk',
  description:
    'Theo dõi hoạt động của một người (Game, Voice, Online, Message)',
  category: 'stalker',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'user',
      description: 'Người bạn muốn theo dõi',
      type: 'USER',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma || !ctx.guildId) {
      await ctx.reply(
        '❌ Hệ thống chưa sẵn sàng hoặc lệnh chỉ dùng trong server.',
      );
      return;
    }

    const target = ctx.getOption('user', 'user');
    if (!target || target.bot) {
      await ctx.reply('❌ Không thể theo dõi bot.');
      return;
    }
    if (target.id === ctx.userId) {
      await ctx.reply('❌ Bạn không thể tự theo dõi chính mình.');
      return;
    }

    const optedOut = await prisma.client.stalkerOptOut.findUnique({
      where: { userId: target.id },
    });
    if (optedOut) {
      await ctx.reply('🚫 Người này đã chặn tính năng theo dõi.');
      return;
    }

    // Get or create subscription
    let sub = await prisma.client.stalkerSubscription.findUnique({
      where: {
        trackerId_targetId_guildId: {
          trackerId: ctx.userId,
          targetId: target.id,
          guildId: ctx.guildId,
        },
      },
    });

    if (!sub) {
      sub = await prisma.client.stalkerSubscription.create({
        data: {
          trackerId: ctx.userId,
          targetId: target.id,
          guildId: ctx.guildId,
          onOnline: true,
          onVoice: true,
          onGame: true,
          onMessage: true,
        },
      });
    }

    const guildName = ctx.guild?.name || 'server';
    const modes: StalkModes = {
      onOnline: sub.onOnline,
      onVoice: sub.onVoice,
      onGame: sub.onGame,
      onMessage: sub.onMessage,
    };

    await ctx.defer();

    const msg = await ctx.editReply({
      embeds: [statusEmbed(target.username, modes, guildName)],
      components: [modeButtons(modes)],
    });

    const attachCollector = (message: typeof msg) => {
      const col = message.createMessageComponentCollector({ time: 120_000 });

      col.on('collect', async (i) => {
        if (i.user.id !== ctx.userId) {
          await i.reply({
            content: '❌ Nút này không dành cho bạn.',
            flags: 64,
          });
          return;
        }

        const cid = i.customId;

        if (cid === 'stalk_clear') {
          await prisma.client.stalkerSubscription.deleteMany({
            where: {
              trackerId: ctx.userId,
              targetId: target.id,
              guildId: ctx.guildId!,
            },
          });
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0x6b7280)
                .setTitle('👀 Theo dõi')
                .setDescription(`✅ Đã bỏ theo dõi **${target.username}**.`),
            ],
            components: [],
          });
          return;
        }

        // Toggle mode
        const modeKey = cid.replace('stalk_', '') as keyof StalkModes;
        if (modeKey in modes) {
          modes[modeKey] = !modes[modeKey];

          // Don't allow all-off
          if (
            !modes.onOnline &&
            !modes.onVoice &&
            !modes.onGame &&
            !modes.onMessage
          ) {
            modes[modeKey] = true;
          }

          await prisma.client.stalkerSubscription.update({
            where: { id: sub.id },
            data: { [modeKey]: modes[modeKey] },
          });

          await i.update({
            embeds: [statusEmbed(target.username, modes, guildName)],
            components: [modeButtons(modes)],
          });
        }
      });

      col.on('end', async (_, reason) => {
        if (reason === 'time') {
          try {
            await msg.edit({ components: [] }).catch(() => {});
          } catch {
            /* deleted */
          }
        }
      });
    };

    attachCollector(msg);

    // DM confirmation
    try {
      const active = MODE_DEFS.filter((m) => modes[m.key]);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('✅ Đã bật Stalker')
        .setDescription(
          `Bạn đang theo dõi **${target.username}** tại **${guildName}**`,
        )
        .addFields(
          {
            name: 'Chế độ hoạt động',
            value:
              active.map((m) => `${m.emoji} ${m.label}`).join(' | ') ||
              'Không có',
            inline: false,
          },
          {
            name: 'Bạn sẽ nhận DM khi:',
            value:
              active.map((m) => `• ${m.desc}`).join('\n') ||
              '• (đã tắt tất cả chế độ)',
            inline: false,
          },
        )
        .setTimestamp();

      await ctx.author.send({ embeds: [dmEmbed] });
    } catch {
      /* DMs closed */
    }
  },
};

export default stalk;
