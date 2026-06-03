import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder, User } from 'discord.js';
import { DISCORD_CDN } from '../../constants';

const userInfo: ActionCommand = {
  name: 'userinfo',
  description: 'Hiển thị thông tin người dùng',
  category: 'common',
  optionalArgs: [
    {
      name: 'user',
      description: 'Người dùng muốn xem (mặc định là bản thân)',
      type: 'USER',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const targetUser =
      (ctx.getOption('user', 'user') as User | null) || ctx.author;

    const guild = ctx.guild;

    // Fetch full user for banner
    const fetched = await targetUser.fetch(true);

    const avatarUrl = fetched.avatar
      ? `${DISCORD_CDN}/avatars/${fetched.id}/${fetched.avatar}.${fetched.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=512`
      : `${DISCORD_CDN}/embed/avatars/${(BigInt(fetched.id) >> 22n) % 6n}.png`;

    const bannerUrl = fetched.banner
      ? `${DISCORD_CDN}/banners/${fetched.id}/${fetched.banner}.${fetched.banner.startsWith('a_') ? 'gif' : 'webp'}?size=600`
      : null;

    const embed = new EmbedBuilder()
      .setColor(fetched.accentColor || 0x5865f2)
      .setTitle(`${fetched.displayName || fetched.username}`)
      .setThumbnail(avatarUrl)
      .addFields(
        {
          name: '🏷️ Tag',
          value: fetched.tag,
          inline: true,
        },
        {
          name: '🆔 ID',
          value: fetched.id,
          inline: true,
        },
        {
          name: '📅 Tạo tài khoản',
          value: `<t:${Math.floor(fetched.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: '🤖 Bot',
          value: fetched.bot ? 'Có' : 'Không',
          inline: true,
        },
      );

    // Guild member info
    if (guild) {
      let member = guild.members.cache.get(fetched.id);
      if (!member) {
        try {
          member = await guild.members.fetch(fetched.id);
        } catch {
          // User not in guild
        }
      }

      if (member) {
        const roles = member.roles.cache
          .filter((r) => r.id !== guild.id)
          .sort((a, b) => b.position - a.position);
        const topRoles = roles.first(5).map((r) => `<@&${r.id}>`);

        embed.addFields(
          {
            name: '📥 Tham gia server',
            value: member.joinedAt
              ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`
              : 'Không rõ',
            inline: true,
          },
          {
            name: '🎭 Nickname',
            value: member.nickname || 'Không có',
            inline: true,
          },
          {
            name: `🏅 Roles (${roles.size})`,
            value:
              topRoles.length > 0
                ? topRoles.join(', ') +
                  (roles.size > 5 ? ` +${roles.size - 5}` : '')
                : 'Không có',
            inline: false,
          },
        );

        // XP and GitHub info if available
        if (deps?.prisma) {
          const dbUser = await deps.prisma.user?.findUnique({
            where: { discordId: fetched.id },
          });

          if (dbUser) {
            const guildMember = await deps.prisma.guildMember?.findUnique({
              where: {
                userId_guildId: { userId: dbUser.id, guildId: guild.id },
              },
            });
            if (guildMember) {
              embed.addFields({
                name: '✨ XP / Level',
                value: `Level **${guildMember.level}** — ${guildMember.xp} XP`,
                inline: true,
              });
            }

            if (dbUser.githubUsername) {
              try {
                // We use axios directly since it's simple enough
                const { default: axios } = await import('axios');
                const ghRes = await axios.get(
                  `https://api.github.com/users/${dbUser.githubUsername}`,
                  {
                    headers: { 'User-Agent': 'DiscordBot' },
                  },
                );

                if (ghRes.status === 200) {
                  const gh = ghRes.data;
                  embed.addFields({
                    name: '🐙 GitHub',
                    value: `[${gh.login}](${gh.html_url})\n📦 ${gh.public_repos} repo(s)\n👥 ${gh.followers} followers`,
                    inline: true,
                  });
                  // If no avatar is present, we could use GitHub's, but Discord avatar is priority
                }
              } catch (_e) {
                embed.addFields({
                  name: '🐙 GitHub',
                  value: `[${dbUser.githubUsername}](https://github.com/${dbUser.githubUsername}) (Không thể tải chi tiết)`,
                  inline: true,
                });
                console.error(_e);
              }
            }
          }
        }
      }
    }

    if (bannerUrl) embed.setImage(bannerUrl);
    embed.setFooter({ text: `ID: ${fetched.id}` }).setTimestamp();

    await ctx.reply({ embeds: [embed] });
  },
};

export default userInfo;
