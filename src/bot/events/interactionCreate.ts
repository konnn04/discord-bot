import { Interaction, MessageFlags, Collection } from 'discord.js';
import { BotClient } from '../types/bot.types';
import { ContextAdapter } from '../contexts/ContextAdapter';
import { appConfig } from '@src/config/app';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as BotClient;
    const command = client.actionCommands.get(interaction.commandName);

    if (!command) {
      console.warn(`[WARN] Command "${interaction.commandName}" not found`);
      return;
    }

    if (!client.cooldowns.has(command.name)) {
      client.cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name)!;
    const cooldownAmount = (command.cooldown ?? appConfig.discord.cooldown);

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        await interaction.reply({
          content: `⏰ Please wait ${timeLeft.toFixed(1)}s before using \`${command.name}\` again.`,
          ephemeral: true
        });
        return;
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
      const ctx = new ContextAdapter(interaction);
      
      const args: Record<string, any> = {};
      
      if (command.optionalArgs) {
        for (const arg of command.optionalArgs) {
            const val = ctx.getOption(arg.name, arg.type?.toLowerCase() as any);
            if (val !== null && val !== undefined) {
                args[arg.name] = val;
            }
        }
      }

      await command.execute(ctx, args);
    } catch (error) {
      console.error(`[ERROR] Command "${command.name}" execution failed:`, error);
      
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: '❌ An error occurred while executing this command!'
          });
        } else {
          await interaction.reply({
            content: '❌ An error occurred while executing this command!',
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('[ERROR] Failed to send error message:', replyError);
      }
    }
  },
};