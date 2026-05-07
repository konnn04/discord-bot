import type { EventHandler } from 'shared/src/types/discord.types';
import { GuildMember, EmbedBuilder } from 'discord.js';

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

    const msgTemplate =
      settings.welcome.message ||
      '👋 Chào mừng {user.mention} đến với **{server}**!';

    const msg = msgTemplate
      .replace(/\{user\}/g, member.user.username)
      .replace(/\{user\.mention\}/g, `<@${member.id}>`)
      .replace(/\{server\}/g, member.guild.name)
      .replace(/\{memberCount\}/g, String(member.guild.memberCount));

    await (ch as any)
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10b981)
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(msg)
            .setFooter({ text: `Thành viên thứ #${member.guild.memberCount}` })
            .setTimestamp(),
        ],
      })
      .catch(() => {});
  },
};

export default guildMemberAddEvent;
