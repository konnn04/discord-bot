import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder, User } from "discord.js";
import axios from "axios";
import { I18nService } from "@services/I18nService";

const BonkCommand: ActionCommand = {
    name: "bonk",
    description: "Bonk someone! Go to horny jail! 🔨",
    helpDescription: "Bonk a user with a random anime GIF",
    optionalArgs: [
        {
            name: "user",
            description: "The user you want to bonk",
            type: "USER",
            required: true
        }
    ],
    async execute(ctx: ContextAdapter) {
        const targetUser = ctx.getOption("user", "user") as User;

        if (!targetUser) {
            await ctx.reply({ content: await I18nService.t(ctx.guild?.id, "actions.bonk.noUser"), ephemeral: true });
            return;
        }

        await ctx.defer();

        try {
            // Try multiple APIs for bonk GIF
            let gifUrl: string;
            
            try {
                const response = await axios.get("https://api.waifu.pics/sfw/bonk");
                gifUrl = response.data.url;
            } catch {
                // Fallback to some-random-api
                const response = await axios.get("https://some-random-api.com/animu/bonk");
                gifUrl = response.data.link;
            }

            const messages = await I18nService.getArray(ctx.guild?.id, "actions.bonk.messages");
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const formattedMessage = I18nService.format(randomMessage, { user: ctx.user, target: targetUser });

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setDescription(formattedMessage)
                .setImage(gifUrl)
                .setTimestamp();

            await ctx.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[ERROR] Failed to fetch bonk GIF:", error);
            await ctx.editReply({ content: await I18nService.t(ctx.guild?.id, "actions.bonk.fail") });
        }
    }
};

export default BonkCommand;
