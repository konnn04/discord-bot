import { ActionCommand } from '@src/shared/types/bot.types';
import { LevelingService } from '@services/LevelingService';
import { EmbedBuilder } from 'discord.js';

const leaderboardCommand: ActionCommand = {
  name: 'leaderboard',
  description: 'View the top 10 users in the server',
  execute: async (ctx) => {
    if (!ctx.guild) {
      await ctx.reply('This command can only be used in a server.');
      return;
    }

    const leaderboard = await LevelingService.getLeaderboard(ctx.guild.id, 10);
    
    if (leaderboard.length === 0) {
      await ctx.reply('No data yet! Start chatting to gain XP.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 Leaderboard for ${ctx.guild.name}`)
      .setTimestamp();

    let description = '';
    
    for (let i = 0; i < leaderboard.length; i++) {
        const stats = leaderboard[i];
        const mention = `<@${stats.userId}>`; 
        
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        
        description += `${medal} ${mention}\n`;
        description += `Lvl ${stats.level} • XP: ${stats.xp?.toLocaleString()} • 💬 ${stats.messageCount} • 🎙️ ${Math.floor((stats.voiceSeconds || 0)/60)}m\n\n`;
    }

    embed.setDescription(description);

    await ctx.reply({ embeds: [embed] });
  },
};

export default leaderboardCommand;
