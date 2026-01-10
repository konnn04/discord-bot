import { Message, Collection } from 'discord.js';
import { BotClient } from '../types/bot.types';
import { ContextAdapter } from '../contexts/ContextAdapter';
import { appConfig } from '@src/config/app';

export default {
  name: 'messageCreate',
  async execute(message: Message) {
    // Ignore bots
    if (message.author.bot) return;

    const client = message.client as BotClient;
    const prefix = appConfig.discord.prefix;

    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) return;

    // Parse command name
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args[0]?.toLowerCase();

    if (!commandName) return;

    // Get command
    const command = client.actionCommands.get(commandName);

    if (!command) return;

    // Check if command is slash-only
    if (command.isOnlySlashCommand) {
      await message.reply({
        content: `❌ This command is only available as a slash command. Use \`/${commandName}\` instead.`,
      }).catch(() => {});
      return;
    }

    // Cooldown check
    if (!client.cooldowns.has(command.name)) {
      client.cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name)!;
    const cooldownAmount = command.cooldown ?? appConfig.discord.cooldown;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        const reply = await message.reply({
          content: `⏰ Please wait ${timeLeft.toFixed(1)}s before using \`${command.name}\` again.`,
        });
        
        // Auto-delete cooldown message after 5s
        setTimeout(() => {
          reply.delete().catch(() => {});
        }, 5000);
        return;
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // Execute command
    try {
      const ctx = new ContextAdapter(message, commandName);
      await command.execute(ctx);
    } catch (error) {
      console.error(`[ERROR] Command "${command.name}" execution failed:`, error);
      
      await message.reply({
        content: '❌ An error occurred while executing this command!',
      }).catch(() => {});
    }
  },
};
