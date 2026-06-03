import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { getLeetcodeApi } from '../../services/leetcode-api.client';
import type { PrismaService } from '../../../prisma/prisma.service';
import { EmbedBuilder } from 'discord.js';
import { DIFF_EMOJI } from '../../constants';

const myLeetcode: ActionCommand = {
  name: 'my_leetcode',
  description: 'Cài đặt thông tin LeetCode của bạn',
  category: 'presence',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'username',
      description: 'LeetCode username của bạn',
      type: 'STRING',
      required: false,
    },
    {
      name: 'clear',
      description: 'Xóa thông tin LeetCode',
      type: 'BOOLEAN',
      required: false,
    },
    {
      name: 'show_on_presence',
      description: 'Hiển thị lên Public Presence API',
      type: 'BOOLEAN',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const prisma = deps?.prisma as PrismaService | undefined;
    if (!prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const username = ctx.getOption('username', 'string') as string | null;
    const clear = ctx.getOption('clear', 'boolean') as boolean | null;
    const showOnPresence = ctx.getOption('show_on_presence', 'boolean') as
      | boolean
      | null;
    const discordId = ctx.userId;

    await ctx.defer();

    try {
      if (clear) {
        await prisma.client.user.update({
          where: { discordId },
          data: { leetcodeUsername: null, leetcodeShowPresence: false },
        });
        await ctx.editReply('✅ Đã xóa thông tin LeetCode.');
        return;
      }

      const updateData: any = {};

      if (username) {
        try {
          const api = getLeetcodeApi();
          await api.getUser(username);
          updateData.leetcodeUsername = username;
        } catch {
          await ctx.editReply(
            `❌ Không tìm thấy user LeetCode: \`${username}\``,
          );
          return;
        }
      }

      if (showOnPresence !== null) {
        updateData.leetcodeShowPresence = showOnPresence;
      }

      await prisma.client.user.upsert({
        where: { discordId },
        update: updateData,
        create: {
          discordId,
          username: ctx.author.username,
          ...updateData,
        },
      });

      // Fetch & display profile
      const effectiveUsername =
        username ||
        (await prisma.client.user.findUnique({ where: { discordId } }))
          ?.leetcodeUsername;

      if (effectiveUsername) {
        try {
          const api = getLeetcodeApi();
          const profile = await api.getUser(effectiveUsername);
          const stats = profile.submitStats.acSubmissionNum;

          const embed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setAuthor({
              name: profile.username,
              iconURL: profile.profile.userAvatar,
              url: `https://leetcode.com/${profile.username}`,
            })
            .setTitle(`📊 Hồ sơ LeetCode`)
            .setThumbnail(profile.profile.userAvatar)
            .addFields(
              {
                name: 'Tên',
                value: profile.profile.realName || 'N/A',
                inline: true,
              },
              {
                name: 'Ranking',
                value: `#${profile.profile.ranking.toLocaleString()}`,
                inline: true,
              },
              {
                name: 'Bài đã giải',
                value: stats
                  .filter((s) => s.difficulty !== 'All')
                  .map(
                    (s) =>
                      `${DIFF_EMOJI[s.difficulty] || ''} ${s.difficulty}: **${s.count}**`,
                  )
                  .join('\n'),
                inline: false,
              },
            )
            .setFooter({
              text: `Tổng: ${stats.find((s) => s.difficulty === 'All')?.count || 0} bài`,
            });

          await ctx.editReply({ embeds: [embed] });
          return;
        } catch {
          /* profile display failed — but settings saved */
        }
      }

      await ctx.editReply(
        username
          ? `✅ Đã lưu LeetCode username: **${username}**`
          : '✅ Đã cập nhật cài đặt LeetCode.',
      );
    } catch (err: any) {
      await ctx.editReply(`❌ Lỗi: ${err.message || 'Không thể xử lý.'}`);
    }
  },
};

export default myLeetcode;
