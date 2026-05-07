import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import { EmbedBuilder } from 'discord.js';

const myStalk: ActionCommand = {
  name: 'my_stalk',
  description: 'Xem danh sách những người bạn đang theo dõi',
  category: 'stalker',
  permission: PermissionLevel.EVERYONE,

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const subs = await prisma.client.stalkerSubscription.findMany({
      where: { trackerId: ctx.userId },
      orderBy: { createdAt: 'desc' },
    });

    if (subs.length === 0) {
      await ctx.reply(
        '👀 Bạn chưa theo dõi ai. Dùng `/stalk @user` để bắt đầu!',
      );
      return;
    }

    const lines = subs.map((s, i) => {
      const modes: string[] = [];
      if (s.onOnline) modes.push('🟢Online');
      if (s.onVoice) modes.push('🔊Voice');
      if (s.onGame) modes.push('🎮Game');
      if (s.onMessage) modes.push('💬Chat');
      return `**${i + 1}.** <@${s.targetId}> — ${modes.join(' ') || 'đã tắt hết'}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xf43f5e)
      .setTitle('👀 Danh sách theo dõi')
      .setDescription(lines.join('\n'))
      .setFooter({
        text: `Tổng: ${subs.length} người • Dùng /stalk @user clear:true để bỏ`,
      });

    await ctx.reply({ embeds: [embed] });
  },
};

export default myStalk;
