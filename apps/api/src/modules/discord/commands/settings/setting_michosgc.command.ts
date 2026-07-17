import { ActionCommand, PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { GuildSettingsService } from '../../../settings/guild-settings.service';

const settingMichosgc: ActionCommand = {
  name: 'setting_michosgc',
  description: 'Cấu hình nhận thông báo Giftcode tự động',
  category: 'settings',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'enable',
      description: 'Bật/tắt tính năng thông báo',
      type: 'BOOLEAN',
      required: true,
    },
    {
      name: 'channel',
      description: 'Kênh nhận thông báo (bắt buộc nếu bật)',
      type: 'CHANNEL',
      required: false,
    },
    {
      name: 'role_common',
      description: 'Role tag chung cho tất cả các game',
      type: 'ROLE',
      required: false,
    },
    {
      name: 'role_genshin',
      description: 'Role tag riêng cho Genshin Impact',
      type: 'ROLE',
      required: false,
    },
    {
      name: 'role_hkrpg',
      description: 'Role tag riêng cho Honkai: Star Rail',
      type: 'ROLE',
      required: false,
    },
    {
      name: 'role_honkai3rd',
      description: 'Role tag riêng cho Honkai Impact 3rd',
      type: 'ROLE',
      required: false,
    },
    {
      name: 'role_nap',
      description: 'Role tag riêng cho Zenless Zone Zero',
      type: 'ROLE',
      required: false,
    },
    {
      name: 'role_tot',
      description: 'Role tag riêng cho Tears of Themis',
      type: 'ROLE',
      required: false,
    },
    {
      name: 'clear',
      description: 'Xóa toàn bộ cấu hình michosgc (đưa về mặc định)',
      type: 'BOOLEAN',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps: any) {
    if (!ctx.guildId) {
      await ctx.reply('Lệnh này chỉ dùng được trong server.');
      return;
    }

    const settingsService = deps.guildSettings as GuildSettingsService;
    const enable = ctx.getOption('enable', 'boolean') as boolean;
    const clear = ctx.getOption('clear', 'boolean') as boolean | null;

    if (clear) {
      settingsService.update(ctx.guildId, {
        michosgc: {
          enabled: false,
          channelId: null,
          mode: 'common',
          roleCommon: null,
          roles: {
            genshin: null,
            hkrpg: null,
            honkai3rd: null,
            nap: null,
            tot: null,
          },
        },
      });
      await ctx.reply('✅ Đã xóa cấu hình Michosgc về mặc định.');
      return;
    }

    const channel = ctx.getOption('channel', 'channel');
    const roleCommon = ctx.getOption('role_common', 'role');
    const roleGenshin = ctx.getOption('role_genshin', 'role');
    const roleHkrpg = ctx.getOption('role_hkrpg', 'role');
    const roleHonkai3rd = ctx.getOption('role_honkai3rd', 'role');
    const roleNap = ctx.getOption('role_nap', 'role');
    const roleTot = ctx.getOption('role_tot', 'role');

    const currentSettings = settingsService.get(ctx.guildId);
    const existingMichosgc = currentSettings.michosgc;

    const channelId = channel?.id || existingMichosgc?.channelId;

    if (enable && !channelId) {
      await ctx.reply('❌ Bạn phải cung cấp `channel` khi bật tính năng này!');
      return;
    }

    settingsService.update(ctx.guildId, {
      michosgc: {
        enabled: enable,
        channelId: channelId,
        mode: existingMichosgc?.mode ?? 'common',
        roleCommon: roleCommon?.id || existingMichosgc?.roleCommon || null,
        roles: {
          genshin: roleGenshin?.id || existingMichosgc?.roles?.genshin || null,
          hkrpg: roleHkrpg?.id || existingMichosgc?.roles?.hkrpg || null,
          honkai3rd:
            roleHonkai3rd?.id || existingMichosgc?.roles?.honkai3rd || null,
          nap: roleNap?.id || existingMichosgc?.roles?.nap || null,
          tot: roleTot?.id || existingMichosgc?.roles?.tot || null,
        },
      },
    });

    if (enable) {
      await ctx.reply(`✅ Đã bật thông báo Giftcode tại kênh <#${channelId}>.`);
    } else {
      await ctx.reply(`✅ Đã tắt thông báo Giftcode.`);
    }
  },
};

export default settingMichosgc;
