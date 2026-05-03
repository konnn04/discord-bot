import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

const levelChannel: ActionCommand = {
  name: 'setting_levelchannel',
  description: 'Cài đặt kênh thông báo khi thăng cấp',
  category: 'settings',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'channel',
      description:
        'Kênh muốn gửi thông báo (để trống nếu muốn gửi ở nơi nhắn cuối cùng)',
      type: 'CHANNEL',
      channelTypes: [0], // Text channel
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!deps?.guildSettings || !ctx.guildId) {
      await ctx.reply(
        '❌ Hệ thống chưa sẵn sàng hoặc lệnh này chỉ dùng được trong server.',
      );
      return;
    }

    const channelOption = ctx.getOption('channel', 'channel');

    const current = deps.guildSettings.get(ctx.guildId);

    if (channelOption) {
      deps.guildSettings.update(ctx.guildId, {
        xp: {
          ...current.xp,
          levelUpChannelId: channelOption.id,
        },
      });
      await ctx.reply(
        `✅ Đã cài đặt kênh thông báo thăng hạng là <#${channelOption.id}>.`,
      );
    } else {
      deps.guildSettings.update(ctx.guildId, {
        xp: {
          ...current.xp,
          levelUpChannelId: null,
        },
      });
      await ctx.reply(
        `✅ Đã xóa kênh thông báo. Bot sẽ thông báo ngay tại kênh chat cuối cùng.`,
      );
    }
  },
};

export default levelChannel;
