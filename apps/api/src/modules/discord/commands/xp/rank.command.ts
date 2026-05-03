import { EmbedBuilder, User } from 'discord.js';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';

const rank: ActionCommand = {
  name: 'rank',
  description: 'Xem cấp độ và điểm kinh nghiệm (XP) hiện tại của bạn',
  category: 'xp',
  permission: PermissionLevel.EVERYONE,
  optionalArgs: [
    {
      name: 'user',
      description: 'Người dùng muốn xem rank',
      type: 'USER',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!deps?.prisma) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    const guildId = ctx.guildId;
    if (!guildId) {
      await ctx.reply('❌ Lệnh này chỉ khả dụng trong server.');
      return;
    }

    const targetUser =
      (ctx.getOption('user', 'user') as User | null) || ctx.author;

    if (targetUser.bot) {
      await ctx.reply('🤖 Bot không có rank nha!');
      return;
    }

    const discordId = targetUser.id;
    const username = targetUser.username;
    const avatarUrl = targetUser.displayAvatarURL();

    // Look up internal User by Discord ID first
    const dbUser = await deps.prisma.user.findUnique({
      where: { discordId },
    });

    if (!dbUser) {
      await ctx.reply(
        `❌ **${username}** chưa có điểm XP nào trong server này.`,
      );
      return;
    }

    // Fetch member data using internal user ID
    const member = await deps.prisma.guildMember.findUnique({
      where: { userId_guildId: { userId: dbUser.id, guildId } },
    });

    if (!member) {
      await ctx.reply(
        `❌ **${username}** chưa có điểm XP nào trong server này.`,
      );
      return;
    }

    // Get server rank (count users with strictly more XP, then add 1)
    const rankPosition =
      (await deps.prisma.guildMember.count({
        where: {
          guildId,
          xp: { gt: member.xp },
        },
      })) + 1;

    // Get leveling formula
    let formula = 'exponential';
    let baseXp = 100;

    if (deps?.globalSettings) {
      const g = deps.globalSettings.get();
      formula = g.bot?.levelUpFormula || 'exponential'; // fallback
      baseXp = g.bot?.baseXpForLevelUp || 100;
    } else {
      // Direct DB fallback if globalSettingsRef isn't a service (it is)
      const globalRecord = await deps.prisma.globalSetting.findUnique({
        where: { id: 'global' },
      });
      formula = globalRecord?.settings?.xp?.levelUpFormula || 'exponential';
      baseXp = globalRecord?.settings?.xp?.baseXpForLevelUp || 100;
    }

    // Calculate XP needed for next level
    let requiredXp = 0;
    let currentLevelBaseXp = 0;

    if (formula === 'exponential') {
      for (let i = 1; i <= member.level; i++) {
        currentLevelBaseXp += baseXp * Math.pow(1.5, i - 1);
      }
      requiredXp = currentLevelBaseXp + baseXp * Math.pow(1.5, member.level);
    } else {
      // Linear
      currentLevelBaseXp = member.level * baseXp;
      requiredXp = (member.level + 1) * baseXp;
    }

    const xpInCurrentLevel = member.xp - currentLevelBaseXp;
    const xpNeededForNextLevel = requiredXp - currentLevelBaseXp;
    const progress = Math.min(
      100,
      Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100),
    );

    // Create progress bar
    const barLength = 20;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

    const embed = new EmbedBuilder()
      .setColor(0xffd700) // Gold
      .setAuthor({ name: username, iconURL: avatarUrl || undefined })
      .setTitle(`Rank #${rankPosition}`)
      .addFields(
        { name: '🌟 Level', value: `**${member.level}**`, inline: true },
        { name: '✨ XP', value: `**${member.xp}**`, inline: true },
        {
          name: '📊 Tiến trình',
          value: `${xpInCurrentLevel} / ${xpNeededForNextLevel} XP\n\`${progressBar}\` ${progress.toFixed(1)}%`,
        },
      )
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  },
};

export default rank;
