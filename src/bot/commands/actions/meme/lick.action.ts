import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, User } from "discord.js";
import axios from "axios";
import { I18nService } from "@services/I18nService";

const LickCommand: ActionCommand = {
    name: "lick",
    description: "Lick someone! 👅",
    helpDescription: "Lick a user with a random anime GIF",
    optionalArgs: [
        {
            name: "user",
            description: "The user you want to lick",
            type: "USER",
            required: true
        }
    ],
    async execute(ctx: ContextAdapter) {
        const targetUser = ctx.getOption("user", "user") as User;

        if (!targetUser) {
            await ctx.reply({ content: await I18nService.t(ctx.guild?.id, "actions.lick.noUser"), ephemeral: true });
            return;
        }

        // Self-action check
        if (targetUser.id === ctx.user.id) {
            await ctx.reply({ content: await I18nService.t(ctx.guild?.id, "actions.lick.self"), ephemeral: true });
            return;
        }

        await ctx.defer();

        try {
            // Try waifu.pics API for lick GIF
            const response = await axios.get("https://api.waifu.pics/sfw/lick");
            const gifUrl = response.data.url;

            const msg = await I18nService.t(ctx.guild?.id, "actions.lick.message", { user: ctx.user, target: targetUser });

            const embed = new EmbedBuilder()
                .setColor(0xFF69B4)
                .setDescription(msg)
                .setImage(gifUrl)
                .setTimestamp();

            await ctx.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[ERROR] Failed to fetch lick GIF:", error);
            await ctx.editReply({ content: await I18nService.t(ctx.guild?.id, "actions.lick.fail") });
        }
    }
};

export default LickCommand;
