import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder } from "discord.js";
import axios from "axios";
import { I18nService } from "@services/I18nService";

const CryCommand: ActionCommand = {
    name: "cry",
    description: "Show that you're crying 😢",
    helpDescription: "Express your sadness with a random crying anime GIF",
    optionalArgs: [
        {
            name: "reason",
            description: "Why are you crying?",
            type: "STRING",
            required: false
        }
    ],
    async execute(ctx: ContextAdapter) {
        const reason = ctx.getOption("reason", "string");

        await ctx.defer();

        try {
            const response = await axios.get("https://api.waifu.pics/sfw/cry");
            const gifUrl = response.data.url;

            const embed = new EmbedBuilder()
                .setColor(0x4169E1)
                .setImage(gifUrl)
                .setTimestamp();

            if (reason) {
                const msg = await I18nService.t(ctx.guild?.id, "actions.cry.withReason", { user: ctx.user, reason });
                embed.setDescription(msg);
            } else {
                const msg = await I18nService.t(ctx.guild?.id, "actions.cry.default", { user: ctx.user });
                embed.setDescription(msg);
            }

            await ctx.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[ERROR] Failed to fetch cry GIF:", error);
            await ctx.editReply({ content: await I18nService.t(ctx.guild?.id, "actions.cry.fail") });
        }
    }
};

export default CryCommand;
