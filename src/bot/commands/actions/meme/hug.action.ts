import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, User } from "discord.js";
import axios from "axios";
import { I18nService } from "@services/I18nService";

const HugCommand: ActionCommand = {
    name: "hug",
    description: "Hug someone! 🤗",
    helpDescription: "Give a warm hug to a user with a random anime GIF",
    optionalArgs: [
        {
            name: "user",
            description: "The user you want to hug",
            type: "USER",
            required: true
        }
    ],
    async execute(ctx: ContextAdapter) {
        const targetUser = ctx.getOption("user", "user") as User;

        if (!targetUser) {
            await ctx.reply({ content: await I18nService.t(ctx.guild?.id, "actions.hug.noUser"), ephemeral: true });
            return;
        }

        await ctx.defer();

        try {
            const response = await axios.get("https://api.waifu.pics/sfw/hug");
            const gifUrl = response.data.url;

            const messages = await I18nService.getArray(ctx.guild?.id, "actions.hug.messages");
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const formattedMessage = I18nService.format(randomMessage, { user: ctx.user, target: targetUser });

            const embed = new EmbedBuilder()
                .setColor(0xFFB6C1)
                .setDescription(formattedMessage)
                .setImage(gifUrl)
                .setTimestamp();

            await ctx.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[ERROR] Failed to fetch hug GIF:", error);
            await ctx.editReply({ content: await I18nService.t(ctx.guild?.id, "actions.hug.fail") });
        }
    }
};

export default HugCommand;
