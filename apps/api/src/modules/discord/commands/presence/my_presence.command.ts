import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';

const myPresence: ActionCommand = {
  name: 'my_presence',
  description: 'Bật/tắt Public Presence API (giống Lanyard)',
  helpDescription:
    'Kích hoạt hoặc tắt tính năng chia sẻ trạng thái Discord qua API công khai. Khi bật, bạn sẽ nhận được link API có thể gắn vào website cá nhân.',
  category: 'presence',
  permission: PermissionLevel.EVERYONE,
  isOnlySlashCommand: true,
  optionalArgs: [
    {
      name: 'enable',
      description: 'Bật (True) hoặc Tắt (False)',
      type: 'BOOLEAN',
      required: true,
    },
    {
      name: 'guild',
      description:
        'ID guild muốn showcase (bạn phải là thành viên, không bắt buộc)',
      type: 'STRING',
      required: false,
    },
    {
      name: 'clear_guilds',
      description: 'Xóa toàn bộ danh sách showcase guilds',
      type: 'BOOLEAN',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!deps?.prisma || !ctx.guildId) {
      await ctx.reply(
        '❌ Lệnh này chỉ dùng được trong server và hệ thống cần kết nối database.',
      );
      return;
    }

    const enable = ctx.getOption('enable', 'boolean') as boolean;
    const showcaseGuildId = ctx.getOption('guild', 'string') as string | null;
    const clearGuilds = ctx.getOption('clear_guilds', 'boolean') as
      | boolean
      | null;
    const discordId = ctx.author.id;
    const client = deps.discordClient;

    try {
      if (enable) {
        // Validate showcase guild if provided
        let showcaseGuildIds: string[] = [];

        if (showcaseGuildId) {
          // Check that user is actually in that guild and bot can see it
          const targetGuild = client?.guilds.cache.get(showcaseGuildId);
          if (!targetGuild) {
            await ctx.reply(
              '❌ Bot không thể truy cập guild đó. Đảm bảo bot đang ở trong guild bạn chỉ định.',
            );
            return;
          }

          let targetMember;
          try {
            targetMember = await targetGuild.members.fetch(discordId);
          } catch {
            targetMember = null;
          }

          if (!targetMember) {
            await ctx.reply('❌ Bạn không phải thành viên của guild đó.');
            return;
          }

          // Merge with existing showcase guilds
          const existing = await deps.prisma.publicPresence.findUnique({
            where: { discordId },
          });
          const currentIds: string[] = existing?.showcaseGuildIds || [];
          showcaseGuildIds = [...new Set([...currentIds, showcaseGuildId])];
        }

        // Handle clear_guilds flag
        if (clearGuilds) {
          showcaseGuildIds = [];
        }

        // Upsert the record
        const updateData: any = {
          guildId: ctx.guildId,
          enabled: true,
          showcaseGuildIds: showcaseGuildIds,
        };

        await deps.prisma.publicPresence.upsert({
          where: { discordId },
          create: {
            discordId,
            guildId: ctx.guildId,
            enabled: true,
            showcaseGuildIds: showcaseGuildIds,
          },
          update: updateData,
        });

        // Determine API base URL
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
        const apiLink = `${baseUrl}/public/me?id=${discordId}`;

        const descLines = [
          `Trạng thái của bạn sẽ được theo dõi từ server **${ctx.guild?.name || 'này'}**.`,
          '',
          '**🔗 API Endpoint:**',
          `\`\`\`${apiLink}\`\`\``,
        ];

        if (clearGuilds) {
          descLines.push('🗑️ Đã xóa toàn bộ danh sách showcase guilds.');
        }

        if (showcaseGuildId) {
          const guildName =
            client?.guilds.cache.get(showcaseGuildId)?.name || showcaseGuildId;
          descLines.push(`✅ Đã thêm guild **${guildName}** vào showcase.`);
        }

        descLines.push(
          '',
          '**💡 Lưu ý:**',
          '• Bật **Hiển thị hoạt động** trong Discord Settings → Privacy.',
          '• Chạy lại lệnh với `guild:<id>` để thêm guild showcase.',
          '• Dùng `clear_guilds:True` để xóa hết showcase.',
          '• Dùng `/my_presence enable:False` để tắt hoàn toàn.',
        );

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('✅ Public Presence đã được kích hoạt!')
          .setDescription(descLines.join('\n'))
          .setTimestamp();

        await ctx.reply({ embeds: [embed] });
      } else {
        // Disable presence
        const existing = await deps.prisma.publicPresence.findUnique({
          where: { discordId },
        });

        if (!existing) {
          await ctx.reply('ℹ️ Bạn chưa kích hoạt Public Presence.');
          return;
        }

        await deps.prisma.publicPresence.update({
          where: { discordId },
          data: { enabled: false },
        });

        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('🔒 Public Presence đã bị tắt')
          .setDescription('API sẽ không trả về trạng thái của bạn nữa.')
          .setTimestamp();

        await ctx.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('[my_presence] Error:', error);
      await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  },
};

export default myPresence;
