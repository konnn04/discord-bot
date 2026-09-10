import type { EventHandler } from 'shared/src/types/discord.types';
import { GuildMember, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { renderWelcomeCard } from '../utils/welcome-card';

function fillPlaceholders(template: string, member: GuildMember): string {
  return template
    .replace(/\{user\}/g, member.user.username)
    .replace(/\{displayName\}/g, member.displayName)
    .replace(/\{user\.mention\}/g, `<@${member.id}>`)
    .replace(/\{server\}/g, member.guild.name)
    .replace(/\{memberCount\}/g, String(member.guild.memberCount));
}

const guildMemberAddEvent: EventHandler = {
  name: 'guildMemberAdd',

  async execute(member: GuildMember, deps?: any) {
    const gs = deps?.guildSettings;
    if (!gs) return;

    const settings = gs.get(member.guild.id);
    if (!settings.features.welcome) return;

    const chId = settings.welcome.channelId;
    if (!chId) return;

    const ch = member.guild.channels.cache.get(chId);
    if (!ch || !ch.isTextBased()) return;

    const type = settings.welcome.type ?? 'canvas';

    try {
      if (type === 'canvas') {
        const card = settings.welcome.card ?? {};
        const title = fillPlaceholders(
          card.title || 'Chào mừng {displayName}!',
          member,
        );
        const subtitle = fillPlaceholders(
          card.subtitle || 'Thành viên thứ #{memberCount}',
          member,
        );
        const png = await renderWelcomeCard({
          avatarUrl: member.user.displayAvatarURL({
            extension: 'png',
            size: 256,
          }),
          title,
          subtitle,
        });
        const attachment = new AttachmentBuilder(png, {
          name: 'welcome.png',
        });
        await (ch as any).send({
          content: `<@${member.id}>`,
          files: [attachment],
        });
        return;
      }

      const msg = fillPlaceholders(
        settings.welcome.message ||
          '👋 Chào mừng {user.mention} đến với **{server}**!',
        member,
      );

      if (type === 'text') {
        await (ch as any).send({ content: msg });
        return;
      }

      // Embed welcome
      const embedCfg = settings.welcome.embed;
      const embed = new EmbedBuilder();

      // Color
      let colorInt = 0x5865f2;
      if (embedCfg?.color) {
        const hex = embedCfg.color.replace('#', '');
        const parsed = parseInt(hex, 16);
        if (!isNaN(parsed)) colorInt = parsed;
      }
      embed.setColor(colorInt);

      // Title & Title URL
      if (embedCfg?.title) {
        embed.setTitle(fillPlaceholders(embedCfg.title, member));
        if (embedCfg.titleUrl) {
          try {
            embed.setURL(embedCfg.titleUrl);
          } catch {
            // invalid url ignored
          }
        }
      }

      // Description
      const desc = embedCfg?.description
        ? fillPlaceholders(embedCfg.description, member)
        : msg;
      embed.setDescription(desc);

      // Author
      if (embedCfg?.authorName) {
        embed.setAuthor({
          name: fillPlaceholders(embedCfg.authorName, member),
          iconURL: embedCfg.authorIconUrl || undefined,
          url: embedCfg.authorUrl || undefined,
        });
      }

      // Thumbnail
      if (embedCfg?.useMemberAvatarAsThumbnail !== false) {
        embed.setThumbnail(member.user.displayAvatarURL());
      } else if (embedCfg?.thumbnailUrl) {
        embed.setThumbnail(embedCfg.thumbnailUrl);
      }

      // Banner Image
      if (embedCfg?.imageUrl) {
        embed.setImage(embedCfg.imageUrl);
      }

      // Footer
      if (embedCfg?.footerText) {
        embed.setFooter({
          text: fillPlaceholders(embedCfg.footerText, member),
          iconURL: embedCfg.footerIconUrl || undefined,
        });
      } else {
        embed.setFooter({
          text: `Thành viên thứ #${member.guild.memberCount}`,
        });
      }

      // Timestamp
      if (embedCfg?.timestamp !== false) {
        embed.setTimestamp();
      }

      // Fields
      if (embedCfg?.fields && Array.isArray(embedCfg.fields)) {
        for (const f of embedCfg.fields) {
          if (f.name && f.value) {
            embed.addFields({
              name: fillPlaceholders(f.name, member),
              value: fillPlaceholders(f.value, member),
              inline: Boolean(f.inline),
            });
          }
        }
      }

      await (ch as any).send({
        content: `<@${member.id}>`,
        embeds: [embed],
      });
    } catch {
      // Rendering/sending is best-effort.
    }
  },
};

export default guildMemberAddEvent;
