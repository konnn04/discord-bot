import { ActionCommand } from '@src/shared/types/bot.types';
import { LevelingService } from '@services/LevelingService';
import { EmbedBuilder, GuildMember } from 'discord.js';

const rankCommand: ActionCommand = {
  name: 'rank',
  description: 'View your current level and stats',
  optionalArgs: [
    {
      name: 'user',
      description: 'The user to check rank for',
      type: 'USER',
      required: false,
    }
  ],
  execute: async (ctx, args) => {
    if (!ctx.guild) {
      await ctx.reply('This command can only be used in a server.');
      return;
    }

    const targetUser = args?.user || ctx.member?.user;
    if (!targetUser) return;

    const stats = await LevelingService.getUserStats(ctx.guild.id, targetUser.id);
    const rank = await LevelingService.getRank(ctx.guild.id, targetUser.id);
    
    // XP calcs
    const currentLevel = stats.level || 0;
    const nextLevelXp = LevelingService.getTotalXpForLevel(currentLevel + 1);
    const prevLevelXp = LevelingService.getTotalXpForLevel(currentLevel);
    
    // Progress for this level
    const xpInLevel = (stats.xp || 0) - prevLevelXp;
    const requiredXpInLevel = nextLevelXp - prevLevelXp;
    const percent = Math.min(100, Math.floor((xpInLevel / requiredXpInLevel) * 100));
    
    const voiceHours = Math.floor((stats.voiceSeconds || 0) / 3600);
    const voiceMinutes = Math.floor(((stats.voiceSeconds || 0) % 3600) / 60);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL() })
      .setTitle(`Rank #${rank}`)
      .setDescription(`Level **${currentLevel}**`)
      .addFields(
        { name: '✨ XP', value: `${stats.xp?.toLocaleString()} / ${nextLevelXp.toLocaleString()} (${percent}%)`, inline: true },
        { name: '💬 Messages', value: `${stats.messageCount?.toLocaleString()}`, inline: true },
        { name: '🎙️ Voice Time', value: `${voiceHours}h ${voiceMinutes}m`, inline: true }
      )
      .setFooter({ text: 'Keep chatting to level up!' })
      .setTimestamp();
      
    // Create progress bar (simple text version)
    const barLength = 15;
    const filled = Math.round((percent / 100) * barLength);
    const empty = barLength - filled;
    // Using Unicode block characters
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    embed.addFields({ name: 'Progress', value: `\`[${bar}]\``, inline: false });

    await ctx.reply({ embeds: [embed] });
  },
};

export default rankCommand;
