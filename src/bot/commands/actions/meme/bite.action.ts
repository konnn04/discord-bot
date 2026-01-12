import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, User } from "discord.js";
import axios from "axios";
import { I18nService } from "@services/I18nService";

const BiteCommand: ActionCommand = {
    name: "bite",
    description: "Bite someone! 🦷",
    helpDescription: "Bite a user with a random anime GIF",
    optionalArgs: [
        {
            name: "user",
            description: "The user you want to bite",
            type: "USER",
            required: true
        }
    ],
    async execute(ctx: ContextAdapter) {
        const targetUser = ctx.getOption("user", "user") as User;

        if (!targetUser) {
            await ctx.reply({ content: await I18nService.t(ctx.guild?.id, "actions.bite.noUser"), ephemeral: true });
            return;
        }

        if (targetUser.id === ctx.user.id) {
            await ctx.reply({ content: await I18nService.t(ctx.guild?.id, "actions.bite.self"), ephemeral: true });
            return;
        }

        await ctx.defer();

        try {
            const response = await axios.get("https://api.waifu.pics/sfw/bite");
            const gifUrl = response.data.url;

            const messages = await I18nService.getArray(ctx.guild?.id, "actions.bite.messages");
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const formattedMessage = I18nService.format(randomMessage, { user: ctx.user, target: targetUser });

            const embed = new EmbedBuilder()
                .setColor(0xFF8C00)
                .setDescription(formattedMessage)
                .setImage(gifUrl)
                .setTimestamp();

            await ctx.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[ERROR] Failed to fetch bite GIF:", error);
            await ctx.editReply({ content: await I18nService.t(ctx.guild?.id, "actions.bite.fail") });
        }
    }
};

export default BiteCommand;
