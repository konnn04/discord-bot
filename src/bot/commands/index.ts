import { BotClient } from '../types/bot.types';
import { REST, Routes } from 'discord.js';
import { config } from '../../config/env';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ActionCommand } from '@src/shared/types/bot.types';
import { formatSlashCommand } from '../utils/commandBuilder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loadActionCommands = async (): Promise<ActionCommand[]> => {
  const actionCommands = [];
  const actionsPath = join(__dirname, 'actions');
  const actionCategories = readdirSync(actionsPath);

  for (const category of actionCategories) {
    const categoryPath = join(actionsPath, category);
    const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.action.ts') || file.endsWith('.action.js'));
    for (const file of commandFiles) {
      const filePath = join(categoryPath, file);
      const commandModule = await import(filePath);
      const command = commandModule.default;
      actionCommands.push(command);
    }
  }
  return actionCommands;
};

const initCommands = async (client: BotClient): Promise<void> => {
  const actionCommands = await loadActionCommands();
  
  for (const actionCommand of actionCommands) {
    client.actionCommands.set(actionCommand.name, actionCommand);
    
    try {
      const slashCommand = formatSlashCommand(actionCommand);
      client.slashCommands.set(actionCommand.name, slashCommand);
    } catch (error) {
      console.error(`[ERROR] Failed to format command "${actionCommand.name}":`, error);
    }
  }
  
  console.log(`[SUCCESS] Loaded ${client.actionCommands.size} commands (${client.slashCommands.size} slash commands)`);
};

export async function loadCommands(client: BotClient) {
  try {
    client.actionCommands.clear();
    client.slashCommands.clear();
    client.cooldowns.clear();

    await initCommands(client);

    if (client.slashCommands.size > 0) {
      const rest = new REST().setToken(config.discord.token);
      const commandsData = Array.from(client.slashCommands.values()).map(cmd => cmd.toJSON());
      
      console.log(`[INFO] Registering ${commandsData.length} slash commands to Discord API...`);
      
      // await rest.put(
      //   Routes.applicationCommands(config.discord.clientId),
      //   { body: commandsData }
      // );
      
      console.log('[SUCCESS] Registered slash commands with Discord API');
    } else {
      console.warn('[WARN] No slash commands to register');
    }
  } catch (error) {
    console.error('[ERROR] Failed to load/register commands:', error);
    throw error;
  }
}