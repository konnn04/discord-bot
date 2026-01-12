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
        const { I18nService } = await import("@services/I18nService");

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(await I18nService.t(ctx.guildId, 'userinfo.title'))
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: await I18nService.t(ctx.guildId, 'userinfo.username'), value: user.username, inline: true },
                { name: await I18nService.t(ctx.guildId, 'userinfo.displayName'), value: user.displayName, inline: true },
                { name: await I18nService.t(ctx.guildId, 'userinfo.id'), value: user.id, inline: true },
                { name: await I18nService.t(ctx.guildId, 'userinfo.created'), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
                { name: await I18nService.t(ctx.guildId, 'userinfo.bot'), value: user.bot ? await I18nService.t(ctx.guildId, 'userinfo.yes') : await I18nService.t(ctx.guildId, 'userinfo.no'), inline: true }
            )
            .setFooter({ text: await I18nService.t(ctx.guildId, 'music.footer', { user: ctx.user.username }) })
            .setTimestamp();

        if (member) {
            const roles = member.roles.cache
                .filter(role => role.id !== ctx.guild?.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 20);

            embed.addFields(
                { name: await I18nService.t(ctx.guildId, 'userinfo.joined'), value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: false },
                { name: await I18nService.t(ctx.guildId, 'userinfo.nickname'), value: member.nickname || "None", inline: true },
                { name: await I18nService.t(ctx.guildId, 'userinfo.roles'), value: roles.length > 0 ? roles.join(", ") : await I18nService.t(ctx.guildId, 'userinfo.noRoles'), inline: false }
            );

            if (member.premiumSince) {
                embed.addFields({
                    name: await I18nService.t(ctx.guildId, 'userinfo.booster'),
                    value: `<t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:F>`,
                    inline: false
                });
            }
        }

        await ctx.reply({ embeds: [embed] });
    },
};

export default UserinfoCommand;
