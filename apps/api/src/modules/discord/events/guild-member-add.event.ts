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

      // Default: embed
      await (ch as any).send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10b981)
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(msg)
            .setFooter({ text: `Thành viên thứ #${member.guild.memberCount}` })
            .setTimestamp(),
        ],
      });
    } catch {
      // Rendering/sending is best-effort.
    }
  },
};

export default guildMemberAddEvent;
