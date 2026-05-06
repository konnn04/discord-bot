import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { VoiceTagService } from '../../services/voice-tag.service';

const voiceTag: ActionCommand = {
  name: 'setting_voicetag',
  description:
    'Bật/tắt tính năng tag thành viên trong kênh thoại (tạo role tự động)',
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
    if (!ctx.guildId || !ctx.guild) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    const voiceTagService = deps?.voiceTagService as
      | VoiceTagService
      | undefined;
    if (!voiceTagService) {
      await ctx.reply('❌ Dịch vụ Voice Tag chưa sẵn sàng.');
      return;
    }

    const state = ctx.getOption('state', 'boolean') as boolean;
    if (state === null || state === undefined) return;

    await ctx.defer();

    try {
      const guild = ctx.guild;

      // Check bot permissions first
      const botMember = guild.members.me;
      if (!botMember?.permissions.has('ManageRoles')) {
        await ctx.reply(
          '❌ Bot cần quyền **Manage Roles** để bật tính năng này.\n' +
            'Vui lòng cấp quyền và thử lại.',
        );
        return;
      }

      if (state) {
        const msg = await voiceTagService.enable(guild);
        await ctx.reply(msg);
      } else {
        const msg = await voiceTagService.disable(guild);
        await ctx.reply(msg);
      }
    } catch (err: any) {
      await ctx.reply(`❌ Lỗi: ${err.message || 'Không thể xử lý.'}`);
    }
  },
};

export default voiceTag;
