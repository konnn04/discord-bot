import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder } from "discord.js";
import { BotClient } from "@bot/types/bot.types";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BotInfo {
    name: string;
    version: string;
    description: string;
    author: string;
    repository: string;
    features: string[];
    support: {
        issues: string;
        discussions: string;
    };
}

const loadBotInfo = (): BotInfo => {
    try {
        const dataPath = join(__dirname, "../../../../../data/botinfo.json");
        const data = readFileSync(dataPath, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        return {
            name: "MPC Discord Bot",
            version: "0.0.1",
            description: "A multipurpose Discord bot",
            author: "MPC",
            repository: "https://github.com/mpc-ou/discord-bot",
            features: [],
            support: {
                issues: "",
                discussions: ""
            }
        };
    }
};

const InfoCommand: ActionCommand = {
    name: "info",
    description: "Display information about the bot",
    helpDescription: "Shows detailed information about the bot including version, features, statistics, and support links.",
    async execute(ctx: ContextAdapter) {
        const client = ctx.client as BotClient;
        const botInfo = loadBotInfo();
        const { I18nService } = await import("@services/I18nService");
        
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m`;
        const guildId = ctx.guildId;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(await I18nService.t(guildId, 'info.title', { botName: botInfo.name }))
            .setDescription(botInfo.description)
            .setThumbnail(client.user?.displayAvatarURL({ size: 256 }) || "")
            .addFields(
                { name: await I18nService.t(guildId, 'info.version'), value: `\`${botInfo.version}\``, inline: true },
                { name: await I18nService.t(guildId, 'info.author'), value: botInfo.author, inline: true },
                { name: await I18nService.t(guildId, 'info.uptime'), value: uptimeString, inline: true },
                { name: await I18nService.t(guildId, 'info.servers'), value: `${client.guilds.cache.size}`, inline: true },
                { name: await I18nService.t(guildId, 'info.users'), value: `${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`, inline: true },
                { name: await I18nService.t(guildId, 'info.commands'), value: `${client.actionCommands.size}`, inline: true }
            )
            .setFooter({ text: await I18nService.t(guildId, 'music.footer', { user: ctx.user.username }) })
            .setTimestamp();

        if (botInfo.features.length > 0) {
            embed.addFields({
                name: await I18nService.t(guildId, 'info.features'),
                value: botInfo.features.map(f => `• ${f}`).join("\n"),
                inline: false
            });
        }

        let links = [];
        if (botInfo.repository) {
            links.push(`[GitHub](${botInfo.repository})`);
        }
        if (botInfo.support.issues) {
            links.push(`[Report Issues](${botInfo.support.issues})`);
        }
        if (botInfo.support.discussions) {
            links.push(`[Discussions](${botInfo.support.discussions})`);
        }

        if (links.length > 0) {
            embed.addFields({
                name: await I18nService.t(guildId, 'info.links'),
                value: links.join(" • "),
                inline: false
            });
        }

        await ctx.reply({ embeds: [embed] });
    },
};

export default InfoCommand;
