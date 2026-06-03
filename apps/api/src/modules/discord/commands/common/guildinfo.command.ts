import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder, ChannelType } from 'discord.js';
import { DISCORD_CDN } from '../../constants';

const guildInfo: ActionCommand = {
  name: 'guildinfo',
  description: 'Hiển thị thông tin server hiện tại',
  category: 'common',

  async execute(ctx: ContextAdapter) {
    const guild = ctx.guild;
    if (!guild) {
      await ctx.reply('❌ Lệnh này chỉ dùng được trong server.');
      return;
    }

    // Fetch full guild data if needed
    const fetched = await guild.fetch();
    const owner = await guild.fetchOwner().catch(() => null);

    const iconUrl = guild.icon
      ? `${DISCORD_CDN}/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'webp'}?size=512`
      : null;
    const bannerUrl = guild.banner
      ? `${DISCORD_CDN}/banners/${guild.id}/${guild.banner}.${guild.banner.startsWith('a_') ? 'gif' : 'webp'}?size=600`
      : null;

    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .sort((a, b) => b.position - a.position);
    const topRoles = roles.first(5).map((r) => `<@&${r.id}>`);

    const channels = guild.channels.cache;
    const textChannels = channels.filter(
      (c) => c.type === ChannelType.GuildText,
    ).size;
    const voiceChannels = channels.filter(
      (c) => c.type === ChannelType.GuildVoice,
    ).size;
    const stageChannels = channels.filter(
      (c) => c.type === ChannelType.GuildStageVoice,
    ).size;
    const categories = channels.filter(
      (c) => c.type === ChannelType.GuildCategory,
    ).size;

    const boostLevel = fetched.premiumTier;
    const boostCount = fetched.premiumSubscriptionCount || 0;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(guild.name)
      .setThumbnail(iconUrl)
      .addFields(
        {
          name: '👑 Chủ server',
          value: owner ? `${owner.user.tag}` : 'Không rõ',
          inline: true,
        },
        {
          name: '📅 Ngày tạo',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: '👥 Thành viên',
          value: `${guild.memberCount}`,
          inline: true,
        },
        {
          name: '💬 Kênh',
          value: [
            `📝 Text: ${textChannels}`,
            `🔊 Voice: ${voiceChannels}`,
            `🎤 Stage: ${stageChannels}`,
            `📁 Category: ${categories}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🚀 Boost',
          value: `Level ${boostLevel} (${boostCount} boost)`,
          inline: true,
        },
        {
          name: `🎭 Roles (${roles.size})`,
          value:
            topRoles.length > 0
              ? topRoles.join(', ') +
                (roles.size > 5 ? ` +${roles.size - 5}` : '')
              : 'Không có',
          inline: false,
        },
      )
      .setFooter({ text: `ID: ${guild.id}` })
      .setTimestamp();

    if (bannerUrl) embed.setImage(bannerUrl);

    await ctx.reply({ embeds: [embed] });
  },
};

export default guildInfo;
