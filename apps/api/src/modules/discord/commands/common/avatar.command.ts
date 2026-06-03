import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import {
  EmbedBuilder,
  User,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { DISCORD_CDN } from '../../constants';

const avatar: ActionCommand = {
  name: 'avatar',
  description: 'Xem ảnh đại diện / banner của người dùng',
  category: 'common',
  optionalArgs: [
    {
      name: 'user',
      description: 'Người dùng muốn xem (mặc định là bản thân)',
      type: 'USER',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const targetUser =
      (ctx.getOption('user', 'user') as User | null) || ctx.author;

    // Fetch full user data for banner
    const fetched = await targetUser.fetch(true);
    const guild = ctx.guild;

    // Global avatar
    const globalAvatar = fetched.avatar
      ? `${DISCORD_CDN}/avatars/${fetched.id}/${fetched.avatar}.${fetched.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=1024`
      : `${DISCORD_CDN}/embed/avatars/${(BigInt(fetched.id) >> 22n) % 6n}.png`;

    // Server avatar (if in guild)
    let serverAvatar: string | null = null;
    if (guild) {
      const member = guild.members.cache.get(fetched.id);
      if (member?.avatar) {
        serverAvatar = `${DISCORD_CDN}/guilds/${guild.id}/users/${fetched.id}/avatars/${member.avatar}.${member.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=1024`;
      }
    }

    // Banner
    const bannerUrl = fetched.banner
      ? `${DISCORD_CDN}/banners/${fetched.id}/${fetched.banner}.${fetched.banner.startsWith('a_') ? 'gif' : 'webp'}?size=600`
      : null;

    // Avatar decoration
    const decoUrl = fetched.avatarDecorationData?.asset
      ? `${DISCORD_CDN}/avatar-decoration-presets/${fetched.avatarDecorationData.asset}.png?size=256`
      : null;

    // Main embed with global avatar
    const embed = new EmbedBuilder()
      .setColor(fetched.accentColor || 0x5865f2)
      .setTitle(`Ảnh của ${fetched.displayName || fetched.username}`)
      .setImage(globalAvatar)
      .setFooter({ text: 'Global Avatar' });

    const embeds = [embed];

    // Server avatar embed
    if (serverAvatar) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x57f287)
          .setImage(serverAvatar)
          .setFooter({ text: 'Server Avatar' }),
      );
    }

    // Banner embed
    if (bannerUrl) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setImage(bannerUrl)
          .setFooter({ text: 'Banner' }),
      );
    }

    // Avatar decoration embed
    if (decoUrl) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0xeb459e)
          .setImage(decoUrl)
          .setFooter({ text: 'Avatar Decoration' }),
      );
    }

    // Buttons for direct links
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Global Avatar')
        .setStyle(ButtonStyle.Link)
        .setURL(globalAvatar),
    );
    if (serverAvatar) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Server Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(serverAvatar),
      );
    }
    if (bannerUrl) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Banner')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl),
      );
    }

    await ctx.reply({ embeds, components: [row] });
  },
};

export default avatar;
