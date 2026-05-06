import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';

const stalk: ActionCommand = {
  name: 'stalk',
  description: 'Theo dõi hoạt động của một người (Game, Voice, Online)',
  category: 'stalker',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'user',
      description: 'Người bạn muốn theo dõi',
      type: 'USER',
      required: true,
    },
    {
      name: 'online',
      description: 'Thông báo khi online',
      type: 'BOOLEAN',
      required: false,
    },
    {
      name: 'voice',
      description: 'Thông báo khi vào voice',
      type: 'BOOLEAN',
      required: false,
    },
    {
      name: 'game',
      description: 'Thông báo khi đổi game',
      type: 'BOOLEAN',
      required: false,
    },
    {
      name: 'clear',
      description: 'Bỏ theo dõi người này',
      type: 'BOOLEAN',
      required: false,
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
    const clear = ctx.getOption('clear', 'boolean') as boolean | null;
    const onOnline = ctx.getOption('online', 'boolean') as boolean | null;
    const onVoice = ctx.getOption('voice', 'boolean') as boolean | null;
    const onGame = ctx.getOption('game', 'boolean') as boolean | null;

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

    if (clear) {
      await prisma.client.stalkerSubscription.deleteMany({
        where: {
          trackerId: ctx.userId,
          targetId: target.id,
          guildId: ctx.guildId,
        },
      });
      await ctx.reply(`✅ Đã bỏ theo dõi **${target.username}**.`);
      return;
    }

    const existing = await prisma.client.stalkerSubscription.findUnique({
      where: {
        trackerId_targetId_guildId: {
          trackerId: ctx.userId,
          targetId: target.id,
          guildId: ctx.guildId,
        },
      },
    });

    const finalOnline = onOnline ?? existing?.onOnline ?? true;
    const finalVoice = onVoice ?? existing?.onVoice ?? true;
    const finalGame = onGame ?? existing?.onGame ?? true;

    if (!finalOnline && !finalVoice && !finalGame) {
      await ctx.reply('❌ Phải chọn ít nhất 1 chế độ.');
      return;
    }

    await prisma.client.stalkerSubscription.upsert({
      where: {
        trackerId_targetId_guildId: {
          trackerId: ctx.userId,
          targetId: target.id,
          guildId: ctx.guildId,
        },
      },
      update: { onOnline: finalOnline, onVoice: finalVoice, onGame: finalGame },
      create: {
        trackerId: ctx.userId,
        targetId: target.id,
        guildId: ctx.guildId,
        onOnline: finalOnline,
        onVoice: finalVoice,
        onGame: finalGame,
      },
    });

    const modes: string[] = [];
    if (finalOnline) modes.push('Online');
    if (finalVoice) modes.push('Voice');
    if (finalGame) modes.push('Game');
    const modeStr = modes.join(', ');

    await ctx.reply(
      `👀 Đang theo dõi **${target.username}** (${modeStr})\n` +
        'Bot sẽ DM bạn khi có hoạt động!',
    );

    // DM confirmation
    try {
      const guildName = ctx.guild?.name || 'server';
      await ctx.author.send(
        `✅ **Stalker Activated**\n` +
          `Bạn đang theo dõi **${target.username}** tại **${guildName}**\n` +
          `Chế độ: ${modeStr}\n\n` +
          `Bạn sẽ nhận DM khi:\n` +
          `${finalOnline ? '• Người đó online\n' : ''}` +
          `${finalVoice ? '• Người đó vào kênh voice\n' : ''}` +
          `${finalGame ? '• Người đó đổi game\n' : ''}`,
      );
    } catch {
      /* DMs closed — skip */
    }
  },
};

export default stalk;
