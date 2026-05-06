import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { GuildSettingsService } from '../../../settings/guild-settings.service';
import { ChannelType } from 'discord.js';

const settingDailyLeetcode: ActionCommand = {
  name: 'setting_dailyleetcode',
  description: 'Bật/tắt thông báo LeetCode Daily hàng ngày vào một kênh',
  category: 'settings',
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
      description: 'Kênh nhận thông báo (bắt buộc nếu bật)',
      type: 'CHANNEL',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!ctx.guildId || !ctx.guild) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    const gs = deps?.guildSettings as GuildSettingsService | undefined;
    if (!gs) {
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

      const current = gs.get(ctx.guildId);
      gs.update(ctx.guildId, {
        features: { ...current.features, dailyLeetCode: true },
        dailyLeetCode: { channelId: channel.id },
      });

      await ctx.reply(
        `✅ Đã **BẬT** LeetCode Daily. Sẽ gửi vào <#${channel.id}> lúc 8:00 sáng mỗi ngày.`,
      );
    } else {
      const current = gs.get(ctx.guildId);
      gs.update(ctx.guildId, {
        features: { ...current.features, dailyLeetCode: false },
      });

      await ctx.reply('✅ Đã **TẮT** LeetCode Daily.');
    }
  },
};

export default settingDailyLeetcode;
