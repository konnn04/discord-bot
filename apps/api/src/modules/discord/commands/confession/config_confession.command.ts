import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ChannelType } from 'discord.js';

const configConfession: ActionCommand = {
  name: 'config_confession',
  description: 'Bật/tắt kênh nhận confession ẩn danh',
  category: 'confession',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'state',
      description: 'Bật (True) hoặc Tắt (False)',
      type: 'BOOLEAN',
      required: true,
    },
    {
      name: 'channel',
      description: 'Kênh nhận confession (bắt buộc nếu bật)',
      type: 'CHANNEL',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!ctx.guildId || !ctx.guild) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const state = ctx.getOption('state', 'boolean') as boolean;
    if (state === null || state === undefined) return;

    if (state) {
      const channel = ctx.getOption('channel', 'channel');
      if (!channel || channel.type !== ChannelType.GuildText) {
        await ctx.reply('❌ Vui lòng chọn một **kênh văn bản** hợp lệ.');
        return;
      }

      await prisma.client.confessionConfig.upsert({
        where: { guildId: ctx.guildId },
        update: { channelId: channel.id, enabled: true },
        create: { guildId: ctx.guildId, channelId: channel.id, enabled: true },
      });

      await ctx.reply(
        `✅ Đã **BẬT** Confession. Mọi người dùng \`/confess\` sẽ gửi ẩn danh vào <#${channel.id}>.`,
      );
    } else {
      await prisma.client.confessionConfig.update({
        where: { guildId: ctx.guildId },
        data: { enabled: false },
      });

      await ctx.reply('✅ Đã **TẮT** Confession.');
    }
  },
};

export default configConfession;
