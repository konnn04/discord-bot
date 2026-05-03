import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

const language: ActionCommand = {
  name: 'setting_language',
  description: 'Cài đặt ngôn ngữ cho server (VD: vi, en)',
  category: 'settings',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'lang',
      description: 'Ngôn ngữ (vi / en)',
      type: 'STRING',
      required: true,
      choices: [
        { name: 'Tiếng Việt', value: 'vi' },
        { name: 'English', value: 'en' },
      ],
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!deps?.guildSettings || !ctx.guildId) {
      await ctx.reply(
        '❌ Hệ thống chưa sẵn sàng hoặc lệnh này chỉ dùng được trong server.',
      );
      return;
    }

    const lang = ctx.getOption('lang', 'string') as string;
    if (!lang) return;

    deps.guildSettings.update(ctx.guildId, { language: lang });

    await ctx.reply(`✅ Đã thay đổi ngôn ngữ server thành \`${lang}\`.`);
  },
};

export default language;
