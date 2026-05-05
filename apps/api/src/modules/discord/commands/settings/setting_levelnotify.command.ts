import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

const levelNotify: ActionCommand = {
  name: 'setting_levelnotify',
  description: 'Bật hoặc tắt thông báo thăng cấp (mặc định tắt)',
  category: 'settings',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'enabled',
      description: 'True (bật) hoặc False (tắt)',
      type: 'BOOLEAN',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!deps?.guildSettings || !ctx.guildId) {
      await ctx.reply(
        '❌ Hệ thống chưa sẵn sàng hoặc lệnh này chỉ dùng được trong server.',
      );
      return;
    }

    const isEnabled = ctx.getOption('enabled', 'boolean') as boolean;
    const current = deps.guildSettings.get(ctx.guildId);

    deps.guildSettings.update(ctx.guildId, {
      xp: {
        ...current.xp,
        levelUpNotification: isEnabled,
      },
    });

    await ctx.reply(
      `✅ Đã **${isEnabled ? 'BẬT' : 'TẮT'}** thông báo thăng cấp.`,
    );
  },
};

export default levelNotify;
