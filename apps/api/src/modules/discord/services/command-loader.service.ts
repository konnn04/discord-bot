import { Injectable, Logger } from '@nestjs/common';
import { Collection, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { ConfigService } from '@nestjs/config';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { formatSlashCommand } from '../utils/command-builder';

@Injectable()
export class CommandLoaderService {
  private readonly logger = new Logger(CommandLoaderService.name);
  public readonly actionCommands = new Collection<string, ActionCommand>();
  public readonly slashCommands = new Collection<string, SlashCommandBuilder>();

  constructor(private config: ConfigService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadAll(_deps: any): Promise<void> {
    this.actionCommands.clear();
    this.slashCommands.clear();

    const commandsPath = join(__dirname, '..', 'commands');

    if (!existsSync(commandsPath)) {
      this.logger.warn(`Commands directory not found: ${commandsPath}`);
      return;
    }

    const categories = readdirSync(commandsPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const category of categories) {
      const categoryPath = join(commandsPath, category);
      const files = readdirSync(categoryPath).filter(
        (f) => !f.startsWith('_') && f.match(/\.command\.(ts|js)$/),
      );

      // Warn for invalid file structures
      const allFiles = readdirSync(categoryPath);
      for (const f of allFiles) {
        if (
          !f.startsWith('_') &&
          !f.match(/\.command\.(ts|js)$/) &&
          !f.endsWith('.d.ts') &&
          !f.endsWith('.js.map')
        ) {
          this.logger.warn(
            `Sai cấu trúc file command (bỏ qua): ${category}/${f}`,
          );
        }
      }

      for (const file of files) {
        try {
          const filePath = join(categoryPath, file);
          const mod = await import(filePath);

          const command: ActionCommand = mod.default;

          if (!command || !command.name || !command.execute) {
            this.logger.warn(
              `File thiếu cấu trúc command hợp lệ (bỏ qua): ${file}`,
            );
            continue;
          }

          // Ensure category is set
          command.category = command.category || category;

          // Register parent command
          this.actionCommands.set(command.name, command);

          // Register subcommands
          if (command.subcommands && command.subcommands.length > 0) {
            command.isOnlySlashCommand = true; // subcommands cannot work via prefix
            for (const sub of command.subcommands) {
              // Inherit category/permission from parent if not set
              sub.category = sub.category || command.category;
              if (sub.permission === undefined)
                sub.permission = command.permission;
              const key = `${command.name}:${sub.name}`;
              this.actionCommands.set(key, sub);
            }
          }

          // Build slash command

          // Build slash command
          try {
            const slash = formatSlashCommand(command);
            this.slashCommands.set(command.name, slash);
          } catch (err) {
            this.logger.error(
              `Failed to format slash command "${command.name}":`,
              err,
            );
          }
        } catch (err) {
          this.logger.error(`Failed to load command file ${file}:`, err);
        }
      }
    }

    this.logger.log(
      `Loaded ${this.actionCommands.size} commands (${this.slashCommands.size} slash) from ${categories.length} categories`,
    );
  }

  /** Register slash commands with Discord API */
  async registerSlashCommands(): Promise<void> {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const token = this.config.get<string>('DISCORD_TOKEN');

    if (!clientId || !token) {
      this.logger.warn(
        'Missing DISCORD_CLIENT_ID or DISCORD_TOKEN, skipping slash command registration',
      );
      return;
    }

    if (this.slashCommands.size === 0) {
      this.logger.warn('No slash commands to register');
      return;
    }

    try {
      const rest = new REST().setToken(token);
      const commandsData = Array.from(this.slashCommands.values()).map((cmd) =>
        cmd.toJSON(),
      );

      const existingCommands = (await rest.get(
        Routes.applicationCommands(clientId),
      )) as any[];
      const entryPointCommands = existingCommands.filter(
        (cmd) => cmd.type === 4, // 4 is PrimaryEntryPoint
      );

      for (const ep of entryPointCommands) {
        commandsData.push(ep);
      }

      this.logger.log(
        `Registering ${commandsData.length} commands (including ${entryPointCommands.length} entry point commands)...`,
      );

      await rest.put(Routes.applicationCommands(clientId), {
        body: commandsData,
      });

      this.logger.log('Slash commands registered successfully');
    } catch (error) {
      this.logger.error('Failed to register slash commands:', error);
    }
  }

  /** Get a command by name */

  getCommand(name: string): ActionCommand | undefined {
    return this.actionCommands.get(name);
  }

  /** Get all commands grouped by category */
  getCommandsByCategory(): Map<string, ActionCommand[]> {
    const categories = new Map<string, ActionCommand[]>();
    for (const [, cmd] of this.actionCommands) {
      const cat = cmd.category || 'uncategorized';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(cmd);
    }
    return categories;
  }
}
