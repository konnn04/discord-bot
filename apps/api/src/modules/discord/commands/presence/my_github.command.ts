import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

const myGithub: ActionCommand = {
  name: 'my_github',
  description: 'Cài đặt thông tin GitHub của bạn',
  category: 'presence',
  permission: PermissionLevel.EVERYONE,
  isOnlySlashCommand: true,
  optionalArgs: [
    {
      name: 'username',
      description: 'GitHub Username của bạn',
      type: 'STRING',
      required: false,
    },
    {
      name: 'clear',
      description: 'Xóa thông tin GitHub',
      type: 'BOOLEAN',
      required: false,
    },
    {
      name: 'show_on_presence',
      description: 'Cho phép hiển thị lên Public Presence API',
      type: 'BOOLEAN',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!deps?.prisma) {
      await ctx.reply('❌ Hệ thống cần kết nối database.');
      return;
    }

    await ctx.defer();

    const username = ctx.getOption('username', 'string') as string | null;
    const clear = ctx.getOption('clear', 'boolean') as boolean | null;
    const showOnPresence = ctx.getOption('show_on_presence', 'boolean') as
      | boolean
      | null;
    const discordId = ctx.author.id;

    try {
      if (clear) {
        await deps.prisma.user.update({
          where: { discordId },
          data: { githubUsername: null, githubShowPresence: false },
        });
        await ctx.editReply('✅ Đã xóa thông tin GitHub của bạn.');
        return;
      }

      const updateData: any = {};
      let githubValid = false;

      if (username) {
        // Validate GitHub username
        try {
          const res = await axios.get(
            `https://api.github.com/users/${username}`,
          );
          if (res.status === 200) {
            updateData.githubUsername = username;
            githubValid = true;
          }
        } catch {
          await ctx.editReply(`❌ Không tìm thấy user GitHub: \`${username}\``);
          return;
        }
      }

      if (showOnPresence !== null) {
        updateData.githubShowPresence = showOnPresence;
      }

      if (Object.keys(updateData).length === 0) {
        await ctx.editReply(
          'ℹ️ Vui lòng cung cấp `username` hoặc `show_on_presence` hoặc `clear:True` để cập nhật.',
        );
        return;
      }

      await deps.prisma.user.upsert({
        where: { discordId },
        update: updateData,
        create: {
          discordId,
          username: ctx.author.username,
          ...updateData,
        },
      });

      const user = await deps.prisma.user.findUnique({ where: { discordId } });

      const embed = new EmbedBuilder()
        .setColor(0x2b3137)
        .setTitle('✅ Cập nhật GitHub thành công')
        .addFields(
          {
            name: 'Tài khoản GitHub',
            value: user?.githubUsername
              ? `[${user.githubUsername}](https://github.com/${user.githubUsername})`
              : 'Chưa cài đặt',
            inline: true,
          },
          {
            name: 'Hiển thị trên API Presence',
            value: user?.githubShowPresence ? 'Bật 🟢' : 'Tắt 🔴',
            inline: true,
          },
        )
        .setTimestamp();

      if (githubValid && username) {
        embed.setThumbnail(`https://github.com/${username}.png`);
      }

      await ctx.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[my_github] Error:', error);
      await ctx.editReply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  },
};

export default myGithub;
