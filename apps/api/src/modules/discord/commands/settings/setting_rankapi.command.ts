import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';

const settingRankApi: ActionCommand = {
  name: 'setting_rankapi',
  description: 'Bật/tắt API bảng xếp hạng XP của guild',
  helpDescription:
    'Bật hoặc tắt tính năng công khai API bảng xếp hạng XP cho guild. Khi bật, bất kỳ ai cũng có thể truy vấn bảng xếp hạng qua endpoint công khai.',
  category: 'settings',
  permission: PermissionLevel.ADMIN,
  optionalArgs: [
    {
      name: 'enable',
      description: 'Bật (True) hoặc Tắt (False)',
      type: 'BOOLEAN',
      required: true,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const gs = deps?.guildSettings;
    if (!gs || !ctx.guildId) {
      await ctx.reply(
        '❌ Hệ thống chưa sẵn sàng hoặc lệnh này chỉ dùng được trong server.',
      );
      return;
    }

    const enable = ctx.getOption('enable', 'boolean') as boolean;

    const current = gs.get(ctx.guildId);
    gs.update(ctx.guildId, {
      rankApi: { ...current.rankApi, enabled: enable },
    });

    // Build API endpoint URL
    const envDomain =
      process.env.CUSTOM_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN;
    let baseUrl = process.env.API_BASE_URL;
    if (envDomain) {
      baseUrl = envDomain.startsWith('http')
        ? `${envDomain}/api`
        : `https://${envDomain}/api`;
    } else if (!baseUrl) {
      baseUrl = 'http://localhost:3000/api';
    }

    if (enable) {
      const now = new Date();
      const monthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('✅ Rank API đã được bật!')
        .setDescription(
          [
            `Bảng xếp hạng XP của **${ctx.guild?.name || 'server'}** hiện có thể truy cập công khai.`,
            '',
            '**🔗 API Endpoints:**',
            `• Tháng này: \`${baseUrl}/public/rank/${ctx.guildId}?period=${monthPeriod}\``,
            `• Năm nay: \`${baseUrl}/public/rank/${ctx.guildId}?period=${now.getFullYear()}\``,
            `• All-time: \`${baseUrl}/public/rank/${ctx.guildId}\``,
            '',
            '**📋 Tham số query:**',
            '• `period` — `YYYY-MM` (tháng) hoặc `YYYY` (năm), mặc định tháng hiện tại',
            '• `limit` — số lượng top (mặc định 20, tối đa 100)',
            '',
            '**📦 Dữ liệu trả về:**',
            '• `rank`, `username`, `avatar`, `decorationUrl`, `xp` cho mỗi thành viên',
            '',
            '💡 Dùng `/setting_rankapi enable:False` để tắt.',
          ].join('\n'),
        )
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('🔒 Rank API đã bị tắt')
        .setDescription(
          'API bảng xếp hạng XP sẽ không còn phản hồi cho guild này nữa.\n\nDùng `/setting_rankapi enable:True` để bật lại.',
        )
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
    }
  },
};

export default settingRankApi;
