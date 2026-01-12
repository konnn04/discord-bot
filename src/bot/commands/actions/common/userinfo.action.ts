import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, User, GuildMember } from "discord.js";

const UserinfoCommand: ActionCommand = {
    name: "userinfo",
    description: "Display information about a user",
    helpDescription: "Shows detailed information about yourself or another user, including account creation date, server join date, roles, and more.",
    optionalArgs: [
        {
            name: "user",
            description: "The user to get information about",
            type: "USER",
            required: false
        }
    ],
    async execute(ctx: ContextAdapter) {
        const targetUser = ctx.getOption("user", "user") as User | null;
        const user = targetUser || ctx.user;
        const member = ctx.guild?.members.cache.get(user.id);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`👤 User Information`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "Username", value: user.username, inline: true },
                { name: "Display Name", value: user.displayName, inline: true },
                { name: "User ID", value: user.id, inline: true },
                { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
                { name: "Bot Account", value: user.bot ? "✅ Yes" : "❌ No", inline: true }
            )
            .setFooter({ text: `Requested by ${ctx.user.username}` })
            .setTimestamp();

        if (member) {
            const roles = member.roles.cache
                .filter(role => role.id !== ctx.guild?.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 20);

            embed.addFields(
                { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: false },
                { name: "Nickname", value: member.nickname || "None", inline: true },
                { name: "Roles", value: roles.length > 0 ? roles.join(", ") : "No roles", inline: false }
            );

            if (member.premiumSince) {
                embed.addFields({
                    name: "Server Booster Since",
                    value: `<t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:F>`,
                    inline: false
                });
            }
        }

        await ctx.reply({ embeds: [embed] });
    },
};

export default UserinfoCommand;
