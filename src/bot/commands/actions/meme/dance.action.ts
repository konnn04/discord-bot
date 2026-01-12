import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, User } from "discord.js";
import axios from "axios";
import { I18nService } from "@services/I18nService";

const DanceCommand: ActionCommand = {
    name: "dance",
    description: "Show off your dance moves! 💃",
    helpDescription: "Express yourself with a random dancing anime GIF",
    optionalArgs: [
        {
            name: "with",
            description: "Dance with someone!",
            type: "USER",
            required: false
        }
    ],
    async execute(ctx: ContextAdapter) {
        const targetUser = ctx.getOption("with", "user") as User | null;

        await ctx.defer();

        try {
            const response = await axios.get("https://api.waifu.pics/sfw/dance");
            const gifUrl = response.data.url;

            const embed = new EmbedBuilder()
                .setColor(0xFF1493)
                .setImage(gifUrl)
                .setTimestamp();

            if (targetUser) {
                const msg = await I18nService.t(ctx.guild?.id, "actions.dance.withUser", { user: ctx.user, target: targetUser });
                embed.setDescription(msg);
            } else {
                const msg = await I18nService.t(ctx.guild?.id, "actions.dance.default", { user: ctx.user });
                embed.setDescription(msg);
            }

            await ctx.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[ERROR] Failed to fetch dance GIF:", error);
            await ctx.editReply({ content: await I18nService.t(ctx.guild?.id, "actions.dance.fail") });
        }
    }
};

export default DanceCommand;
