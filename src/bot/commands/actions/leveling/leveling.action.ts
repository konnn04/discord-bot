import { ActionCommand } from '@src/shared/types/bot.types';
import { GuildSettingsService } from '@services/GuildSettingsService';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

const levelingCommand: ActionCommand = {
  name: 'leveling',
  description: 'Configure leveling system settings',
  optionalArgs: [
    {
      name: 'action',
      description: 'Action to perform',
      type: 'STRING',
      required: true,
      choices: [
        { name: 'Enable', value: 'enable' },
        { name: 'Disable', value: 'disable' },
        { name: 'Status', value: 'status' },
      ]
    }
  ],
  execute: async (ctx, args) => {
    if (!ctx.guild || !ctx.member) return;

    // Check permissions (Manually for now, until permission system is fully implemented)
    // Assuming context has member with permission check 
    if (typeof ctx.member.permissions.has === 'function') {
        if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await ctx.reply({ content: '❌ You need Administrator permission to use this command.', ephemeral: true });
            return;
        }
    }

    const action = args?.action as string;
    
    if (action === 'status') {
        const settings = await GuildSettingsService.getOrCreate(ctx.guild.id);
        const embed = new EmbedBuilder()
            .setTitle('Leveling System Configuration')
            .setColor(settings.levelingEnabled ? '#00FF00' : '#FF0000')
            .addFields(
                { name: 'Status', value: settings.levelingEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: 'XP per Message', value: `~${settings.xpRateMessage}`, inline: true },
                { name: 'XP per Voice (min)', value: `${settings.xpRateVoice}`, inline: true },
                { name: 'Cooldown', value: `${settings.cooldownMessage}s`, inline: true }
            );
        await ctx.reply({ embeds: [embed] });
        return;
    }

    if (action === 'enable' || action === 'disable') {
        const isEnabled = action === 'enable';
        await GuildSettingsService.update(ctx.guild.id, {
            levelingEnabled: isEnabled
        });
        await ctx.reply(`✅ Leveling system has been **${isEnabled ? 'Enabled' : 'Disabled'}**.`);
    }
  },
};

export default levelingCommand;
