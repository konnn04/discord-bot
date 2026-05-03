import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

const voiceAlert: ActionCommand = {
  name: 'setting_voicealert',
  description: 'Bật/tắt thông báo ra vào kênh thoại',
  category: 'settings',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'state',
      description: 'Bật (True) hoặc Tắt (False)',
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

    const state = ctx.getOption('state', 'boolean') as boolean;
    if (state === null || state === undefined) return;

    // Update the feature flag
    const current = deps.guildSettings.get(ctx.guildId);
    deps.guildSettings.update(ctx.guildId, {
      features: {
        ...current.features,
        voiceWelcome: state,
      },
    });

    await ctx.reply(
      `✅ Đã **${state ? 'BẬT' : 'TẮT'}** tính năng thông báo ra/vào kênh thoại.`,
    );
  },
};

export default voiceAlert;
