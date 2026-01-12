import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, User } from "discord.js";

const AvatarCommand: ActionCommand = {
    name: "avatar",
    description: "Get a user's avatar in the highest resolution",
    helpDescription: "Displays a user's avatar in the highest available resolution (up to 4096x4096) with links to different formats.",
    optionalArgs: [
        {
            name: "user",
            description: "The user whose avatar to display",
            type: "USER",
            required: false
        }
    ],
    async execute(ctx: ContextAdapter) {
        const targetUser = ctx.getOption("user", "user") as User | null;
        const user = targetUser || ctx.user;

        const avatarURL = user.displayAvatarURL({ size: 4096, extension: "png" });
        const avatarURLWebP = user.displayAvatarURL({ size: 4096, extension: "webp" });
        const avatarURLJPG = user.displayAvatarURL({ size: 4096, extension: "jpg" });
        
        let formats = `[PNG](${avatarURL}) • [WebP](${avatarURLWebP}) • [JPG](${avatarURLJPG})`;
        
        if (user.avatar?.startsWith("a_")) {
            const avatarURLGIF = user.displayAvatarURL({ size: 4096, extension: "gif" });
            formats += ` • [GIF](${avatarURLGIF})`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`${user.username}'s Avatar`)
            .setDescription(`**Available formats:**\n${formats}`)
            .setImage(avatarURL)
            .setFooter({ text: `Requested by ${ctx.user.username}` })
            .setTimestamp();

        await ctx.reply({ embeds: [embed] });
    },
};

export default AvatarCommand;
