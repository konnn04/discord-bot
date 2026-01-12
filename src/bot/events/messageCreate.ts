import { Message, Collection } from 'discord.js';
import { BotClient } from '../types/bot.types';
import { ContextAdapter } from '../contexts/ContextAdapter';
import { appConfig } from '@src/config/app';
import { GuildSettingsService } from '@services/GuildSettingsService';
import { LevelingService } from '@services/LevelingService';
import { TextChannel } from 'discord.js';

export default {
  name: 'messageCreate',
  async execute(message: Message) {
    // Ignore bots
    if (message.author.bot) return;

    const client = message.client as BotClient;
    const settings = await GuildSettingsService.getOrCreate(message.guild!.id);
    const prefix = settings.prefix || appConfig.discord.prefix || '!';

    // Check if message starts with prefix
    const isCommand = message.content.startsWith(prefix);
    
    // Add XP for message ONLY if it's NOT a command
    if (message.inGuild() && !isCommand) {
      try {
         await LevelingService.addMessageXp(
            message.guild.id, 
            message.author.id, 
            message.member!, 
            message.channel as TextChannel
         );
      } catch (err) {
         console.error('[Leveling] Failed to add message XP:', err);
      }
    }

    if (!isCommand) return;

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
        
        setTimeout(() => {
          reply.delete().catch(() => {});
        }, 5000);
        return;
      }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // Parse arguments
    const rawArgs = message.content.slice(prefix.length).trim().split(/ +/).slice(1);
    const parsedArgs: Record<string, any> = {};
    const positionalArgs: string[] = [];

    // 1. Separate named and positional args
    for (const arg of rawArgs) {
        if (arg.includes(':')) {
            const [key, value] = arg.split(':');
            parsedArgs[key.toLowerCase()] = value;
        } else {
            positionalArgs.push(arg);
        }
    }

    // 2. Map positional args to command options
    if (command.optionalArgs) {
        let posIndex = 0;
        for (const opt of command.optionalArgs) {
            if (!parsedArgs[opt.name] && posIndex < positionalArgs.length) {
                parsedArgs[opt.name] = positionalArgs[posIndex++];
            }
        }
    }

    // Execute command
    try {
      const ctx = new ContextAdapter(message, commandName);
      await command.execute(ctx, parsedArgs);
    } catch (error) {
      console.error(`[ERROR] Command "${command.name}" execution failed:`, error);
      
      await message.reply({
        content: '❌ An error occurred while executing this command!',
      }).catch(() => {});
    }
  },
};
