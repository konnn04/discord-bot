import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, GuildVerificationLevel } from "discord.js";

const verificationLevels: { [key in GuildVerificationLevel]: string } = {
    [GuildVerificationLevel.None]: "None",
    [GuildVerificationLevel.Low]: "Low",
    [GuildVerificationLevel.Medium]: "Medium",
    [GuildVerificationLevel.High]: "High",
    [GuildVerificationLevel.VeryHigh]: "Very High"
};

const ServerinfoCommand: ActionCommand = {
    name: "serverinfo",
    description: "Display information about the server",
    helpDescription: "Shows detailed information about the current server, including member count, channels, creation date, boost status, and more.",
    async execute(ctx: ContextAdapter) {
        const guild = ctx.guild;

        if (!guild) {
            await ctx.reply({ content: "❌ This command can only be used in a server!", ephemeral: true });
            return;
        }

        const owner = await guild.fetchOwner();
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🏰 ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }) || "")
            .addFields(
                { name: "Server ID", value: guild.id, inline: true },
                { name: "Owner", value: owner.user.toString(), inline: true },
                { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
                { name: "Members", value: `👥 ${guild.memberCount}`, inline: true },
                { name: "Boost Level", value: `${guild.premiumTier > 0 ? '⭐'.repeat(guild.premiumTier) : '❌'} Level ${guild.premiumTier}`, inline: true },
                { name: "Boosts", value: `💎 ${guild.premiumSubscriptionCount || 0}`, inline: true },
                { name: "Verification Level", value: verificationLevels[guild.verificationLevel], inline: true },
                { name: "Channels", value: `📝 ${textChannels} Text\n🔊 ${voiceChannels} Voice\n📁 ${categories} Categories`, inline: true },
                { name: "Roles", value: `${guild.roles.cache.size}`, inline: true }
            )
            .setFooter({ text: `Requested by ${ctx.user.username}` })
            .setTimestamp();

        if (guild.description) {
            embed.setDescription(guild.description);
        }

        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }) || "");
        }

        await ctx.reply({ embeds: [embed] });
    },
};

export default ServerinfoCommand;
