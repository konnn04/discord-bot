import type { EventHandler } from 'shared/src/types/discord.types';
import type { WelcomeEmbedConfig } from 'shared/src/types/settings.types';
import { GuildMember, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { renderWelcomeCard } from '../utils/welcome-card';

/** Discord API error code for "Cannot send messages to this user" (DMs closed/blocked). */
const DISCORD_CANNOT_MESSAGE_USER = 50007;

function fillPlaceholders(template: string, member: GuildMember): string {
  return template
    .replace(/\{user\}/g, member.user.username)
    .replace(/\{displayName\}/g, member.displayName)
    .replace(/\{user\.mention\}/g, `<@${member.id}>`)
    .replace(/\{server\}/g, member.guild.name)
    .replace(/\{memberCount\}/g, String(member.guild.memberCount));
}

/** Build a Discord embed from a WelcomeEmbedConfig, substituting placeholders. */
function buildEmbed(
  embedCfg: WelcomeEmbedConfig | undefined,
  member: GuildMember,
  fallbackDescription: string,
  fallbackFooter: string | null = `Thành viên thứ #${member.guild.memberCount}`,
): EmbedBuilder {
  const embed = new EmbedBuilder();

  let colorInt = 0x5865f2;
  if (embedCfg?.color) {
    const hex = embedCfg.color.replace('#', '');
    const parsed = parseInt(hex, 16);
    if (!isNaN(parsed)) colorInt = parsed;
  }
  embed.setColor(colorInt);

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

  const desc = embedCfg?.description
    ? fillPlaceholders(embedCfg.description, member)
    : fallbackDescription;
  embed.setDescription(desc);

  if (embedCfg?.authorName) {
    embed.setAuthor({
      name: fillPlaceholders(embedCfg.authorName, member),
      iconURL: embedCfg.authorIconUrl || undefined,
      url: embedCfg.authorUrl || undefined,
    });
  }

  if (embedCfg?.useMemberAvatarAsThumbnail !== false) {
    embed.setThumbnail(member.user.displayAvatarURL());
  } else if (embedCfg?.thumbnailUrl) {
    embed.setThumbnail(embedCfg.thumbnailUrl);
  }

  if (embedCfg?.imageUrl) {
    embed.setImage(embedCfg.imageUrl);
  }

  if (embedCfg?.footerText) {
    embed.setFooter({
      text: fillPlaceholders(embedCfg.footerText, member),
      iconURL: embedCfg.footerIconUrl || undefined,
    });
  } else if (fallbackFooter) {
    embed.setFooter({ text: fallbackFooter });
  }

  if (embedCfg?.timestamp !== false) {
    embed.setTimestamp();
  }

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

  return embed;
}

/** Best-effort DM to the new member — DMs closed (50007) is expected and silent. */
async function sendWelcomeDm(
  member: GuildMember,
  dm: {
    enabled: boolean;
    type: 'text' | 'embed';
    message: string | null;
    embed?: WelcomeEmbedConfig;
  },
): Promise<void> {
  if (!dm.enabled) return;

  try {
    if (dm.type === 'embed') {
      const embed = buildEmbed(
        dm.embed,
        member,
        `Chào mừng bạn đã đến với **${member.guild.name}**!`,
        null,
      );
      await member.send({ embeds: [embed] });
      return;
    }

    const msg = fillPlaceholders(
      dm.message || 'Chào mừng bạn đã đến với **{server}**!',
      member,
    );
    await member.send({ content: msg });
  } catch (err: any) {
    if (err?.code !== DISCORD_CANNOT_MESSAGE_USER) {
      console.error(
        `[welcome] Failed to send welcome DM to ${member.id} in ${member.guild.id}:`,
        err,
      );
    }
  }
}

const guildMemberAddEvent: EventHandler = {
  name: 'guildMemberAdd',

  async execute(member: GuildMember, deps?: any) {
    const gs = deps?.guildSettings;
    if (!gs) return;

    const settings = gs.get(member.guild.id);
    if (!settings.features.welcome) return;

    if (settings.welcome.dm) {
      void sendWelcomeDm(member, settings.welcome.dm);
    }

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
      const embed = buildEmbed(settings.welcome.embed, member, msg);
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
