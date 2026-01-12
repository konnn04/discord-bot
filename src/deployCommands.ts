import { REST, Routes } from 'discord.js';
import { config } from './config/env';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ActionCommand } from './shared/types/bot.types';
import { formatSlashCommand } from './bot/utils/commandBuilder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all action commands from the actions directory
 */
const loadActionCommands = async (): Promise<ActionCommand[]> => {
  const actionCommands = [];
  const actionsPath = join(__dirname, 'bot/commands/actions');
  const actionCategories = readdirSync(actionsPath);

  for (const category of actionCategories) {
    const categoryPath = join(actionsPath, category);
    const commandFiles = readdirSync(categoryPath).filter(
      file => file.endsWith('.action.ts') || file.endsWith('.action.js')
    );
    
    for (const file of commandFiles) {
      const filePath = join(categoryPath, file);
      const commandModule = await import(filePath);
      const command = commandModule.default;
      actionCommands.push(command);
    }
  }
  
  return actionCommands;
};

/**
 * Deploy commands to Discord API
 * This will:
 * 1. Register all current commands
 * 2. Remove any commands that no longer exist in the codebase
 */
async function deployCommands() {
  try {
    console.log('[INFO] Loading action commands...');
    const actionCommands = await loadActionCommands();
    console.log(`[SUCCESS] Loaded ${actionCommands.length} action commands`);

    // Format action commands into slash commands
    const slashCommands = [];
    for (const actionCommand of actionCommands) {
      try {
        const slashCommand = formatSlashCommand(actionCommand);
        slashCommands.push(slashCommand);
      } catch (error) {
        console.error(`[ERROR] Failed to format command "${actionCommand.name}":`, error);
      }
    }

    if (slashCommands.length === 0) {
      console.warn('[WARN] No slash commands to register');
      return;
    }

    const commandsData = slashCommands.map(cmd => cmd.toJSON());
    const rest = new REST().setToken(config.discord.token);

    console.log(`[INFO] Deploying ${commandsData.length} slash commands to Discord API...`);
    console.log('[INFO] Commands:', commandsData.map(cmd => cmd.name).join(', '));

    // Deploy application commands (global)
    // This will automatically remove commands that are no longer in the array
    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: commandsData }
    );

    console.log('[SUCCESS] Successfully deployed slash commands to Discord API');
    console.log('[INFO] Note: Commands that were removed from the codebase have been automatically deleted from Discord');
  } catch (error) {
    console.error('[ERROR] Failed to deploy commands:', error);
    process.exit(1);
  }
}

// Run the deployment
deployCommands();
