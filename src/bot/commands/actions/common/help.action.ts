import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder } from "discord.js";
import { appConfig } from "@src/config/app";
import { BotClient } from "@bot/types/bot.types";

const COMMANDS_PER_PAGE = 10;

const getCommandsList = (client: BotClient, page: number = 1) => {
    const commands = Array.from(client.actionCommands.values());
    const totalPages = Math.ceil(commands.length / COMMANDS_PER_PAGE);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    
    const start = (currentPage - 1) * COMMANDS_PER_PAGE;
    const end = start + COMMANDS_PER_PAGE;
    const pageCommands = commands.slice(start, end);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📚 ${appConfig.info.appName.en} - Commands List`)
        .setDescription(`Page ${currentPage}/${totalPages} • Total: ${commands.length} commands`)
        .setFooter({ text: `Use ${appConfig.discord.prefix}help <command> for detailed info` })
        .setTimestamp();

    let commandsList = "";
    for (const cmd of pageCommands) {
        const slashSupport = !cmd.isOnlySlashCommand ? "✅" : "✅";
        const prefixSupport = !cmd.isOnlySlashCommand ? "✅" : "❌";
        
        commandsList += `**${cmd.name}** - ${cmd.description}\n`;
        commandsList += `└ Slash: ${slashSupport} • Prefix: ${prefixSupport}\n\n`;
    }

    embed.addFields({
        name: "Commands",
        value: commandsList || "No commands found"
    });

    return { embed, currentPage, totalPages };
};

const getCommandDetail = (client: BotClient, commandName: string) => {
    const command = client.actionCommands.get(commandName.toLowerCase());
    
    if (!command) {
        return {
            embed: new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle("❌ Command Not Found")
                .setDescription(`Command \`${commandName}\` does not exist.\nUse \`${appConfig.discord.prefix}help\` to see all commands.`)
        };
    }

    const prefix = appConfig.discord.prefix;
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`📖 Command: ${command.name}`)
        .setDescription(command.helpDescription || command.description);

    let usageText = "";
    
    if (!command.isOnlySlashCommand) {
        usageText += `**Prefix Command:**\n\`${prefix}${command.name}\`\n\n`;
        
        if (command.optionalArgs && command.optionalArgs.length > 0) {
            usageText += "**Arguments (prefix style):**\n";
            usageText += "• Main text/query comes first\n";
            usageText += "• Optional parameters use `key:value` format\n\n";
            usageText += "**Example:**\n";
            usageText += `\`${prefix}${command.name} your main text `;
            
            const exampleArgs = command.optionalArgs
                .slice(0, 2)
                .map(opt => `${opt.name}:${opt.type === 'BOOLEAN' ? 'true' : opt.type === 'INTEGER' ? '10' : 'value'}`)
                .join(' ');
            
            usageText += `${exampleArgs}\`\n\n`;
        }
    }

    usageText += `**Slash Command:**\n\`/${command.name}\`\n`;
    
    embed.addFields({
        name: "Usage",
        value: usageText
    });

    if (command.optionalArgs && command.optionalArgs.length > 0) {
        let optionsText = "";
        
        for (const opt of command.optionalArgs) {
            const required = opt.required ? "**[Required]**" : "*[Optional]*";
            const type = opt.type || "STRING";
            
            optionsText += `**${opt.name}** ${required}\n`;
            optionsText += `└ Type: \`${type}\` • ${opt.description}\n`;
            
            if (opt.minLength || opt.maxLength) {
                optionsText += `└ Length: ${opt.minLength || 0}-${opt.maxLength || 6000}\n`;
            }
            if (opt.minValue !== undefined || opt.maxValue !== undefined) {
                optionsText += `└ Range: ${opt.minValue ?? "∞"}-${opt.maxValue ?? "∞"}\n`;
            }
            if (opt.choices && opt.choices.length > 0) {
                const choicesStr = opt.choices.slice(0, 3).map(c => c.name).join(", ");
                optionsText += `└ Choices: ${choicesStr}${opt.choices.length > 3 ? "..." : ""}\n`;
            }
            
            optionsText += "\n";
        }

        embed.addFields({
            name: "Parameters",
            value: optionsText
        });
    }

    // Prefix syntax tip
    if (!command.isOnlySlashCommand && command.optionalArgs && command.optionalArgs.length > 0) {
        embed.addFields({
            name: "💡 Prefix Syntax Tip",
            value: "When using prefix commands, separate options with spaces using `key:value` format.\n" +
                   "Example: `loop:true` `volume:50` `count:10`"
        });
    }

    // Command info
    let infoText = "";
    infoText += `**Slash Command:** ${!command.isOnlySlashCommand ? "✅ Available" : "✅ Available"}\n`;
    infoText += `**Prefix Command:** ${!command.isOnlySlashCommand ? "✅ Available" : "❌ Not Available"}\n`;
    
    if (command.cooldown) {
        infoText += `**Cooldown:** ${command.cooldown / 1000}s\n`;
    } else {
        infoText += `**Cooldown:** ${appConfig.discord.cooldown / 1000}s (default)\n`;
    }

    embed.addFields({
        name: "ℹ️ Info",
        value: infoText
    });

    return { embed };
};

const HelpCommand: ActionCommand = {
    name: "help",
    description: "Display bot commands and usage information",
    helpDescription: "Get help with bot commands. Use without arguments to see all commands, or specify a command name for detailed help.",
    optionalArgs: [
        {
            name: "command",
            description: "The command to get detailed help for",
            type: "STRING",
            required: false
        },
        {
            name: "page",
            description: "Page number for command list",
            type: "INTEGER",
            required: false,
            minValue: 1
        }
    ],
    async execute(ctx: ContextAdapter) {
        const client = ctx.client as BotClient;
        const commandName = ctx.getOption("command", "string") as string | null;
        const page = (ctx.getOption("page", "integer") as number) || 1;

        if (commandName) {
            // Show detailed help for specific command
            const { embed } = getCommandDetail(client, commandName);
            await ctx.reply({ embeds: [embed] });
        } else {
            // Show commands list with pagination
            const { embed, currentPage, totalPages } = getCommandsList(client, page);
            
            await ctx.reply({ embeds: [embed] });
        }
    },
};

export default HelpCommand;
