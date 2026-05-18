import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextChannel,
  EmbedBuilder,
  Colors,
} from 'discord.js';

const BANNED_WORDS = ['địt', 'cặc', 'lồn', 'chó', 'fuck', 'shit'];

function filterContent(text: string): string | null {
  for (const w of BANNED_WORDS) {
    if (text.toLowerCase().includes(w)) return w;
  }
  return null;
}

const confess: ActionCommand = {
  name: 'confess',
  description: 'Gửi lời nhắn ẩn danh đến kênh confession',
  category: 'confession',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma || !ctx.guildId) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const config = await prisma.client.confessionConfig.findUnique({
      where: { guildId: ctx.guildId },
    });
    if (!config || !config.enabled) {
      await ctx.reply({
        content: '🚫 Confession chưa được bật trong server này.',
        flags: 64,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('confess_modal')
      .setTitle('Gửi lời nhắn ẩn danh');

    const contentInput = new TextInputBuilder()
      .setCustomId('content')
      .setLabel('Nội dung lời nhắn')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Nhập lời nhắn bạn muốn gửi ẩn danh...')
      .setMaxLength(1000)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
    );

    try {
      await ctx.showModal(modal);
    } catch {
      await ctx.reply({
        content: '❌ Lệnh này chỉ dùng được qua slash command.',
        flags: 64,
      });
      return;
    }

    const submitted = await ctx.awaitModalSubmit({
      time: 120_000,
      filter: (i) => i.customId === 'confess_modal' && i.user.id === ctx.userId,
    });

    if (!submitted) return;

    await submitted.deferReply({ flags: 64 });

    const content = submitted.fields.getTextInputValue('content').trim();
    if (!content) {
      await submitted.editReply({
        content: '❌ Nội dung không được để trống.',
      });
      return;
    }

    const bad = filterContent(content);
    if (bad) {
      await submitted.editReply({
        content: `🚫 Lời nhắn của bạn chứa từ không phù hợp. Không được gửi.`,
      });
      return;
    }

    // Post to confession channel
    const ch = ctx.guild!.channels.cache.get(config.channelId) as
      | TextChannel
      | undefined;
    if (!ch) {
      await submitted.editReply({
        content: '❌ Kênh confession không tồn tại.',
      });
      return;
    }

    // Process @username mentions
    let processedContent = content;
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const matches = [...content.matchAll(mentionRegex)];

    if (matches.length > 0) {
      try {
        await ctx.guild!.members.fetch();
      } catch {
        /* ignore */
      }

      for (const match of matches) {
        const query = match[1].toLowerCase();
        const member = ctx.guild!.members.cache.find(
          (m) =>
            m.user.username.toLowerCase() === query ||
            (m.user.globalName && m.user.globalName.toLowerCase() === query) ||
            (m.nickname && m.nickname.toLowerCase() === query),
        );
        if (member) {
          processedContent = processedContent.replace(
            match[0],
            `<@${member.id}>`,
          );
        }
      }
    }

    // Generate anonymous number
    const count = await prisma.client.confessionLog.count({
      where: { guildId: ctx.guildId },
    });
    const anonLabel = `Ẩn danh #${count + 1}`;

    try {
      const embed = new EmbedBuilder()
        .setColor(Colors.Purple)
        .setAuthor({ name: `📩 Confession ${anonLabel}` })
        .setDescription(processedContent)
        .setTimestamp()
        .setFooter({ text: 'Dùng lệnh /confess để gửi lời nhắn' });

      const msg = await ch.send({
        embeds: [embed],
      });

      await submitted.editReply({
        content: `✅ Đã gửi lời nhắn ${anonLabel} thành công!`,
      });

      const reactions = ['❤️', '😂', '😮', '😢', '🔥'];
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Promise.all(reactions.map((r) => msg.react(r).catch(() => {})));

      await prisma.client.confessionLog.create({
        data: {
          guildId: ctx.guildId,
          authorId: ctx.userId,
          content: processedContent,
        },
      });
    } catch (err: any) {
      await submitted.editReply({
        content: `❌ Lỗi khi gửi: ${err.message}`,
      });
    }
  },
};

export default confess;
