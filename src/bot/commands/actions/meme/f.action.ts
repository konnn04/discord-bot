import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder } from "discord.js";
import { I18nService } from "@services/I18nService";

const FCommand: ActionCommand = {
    name: "f",
    description: "Press F to pay respects 🎖️",
    helpDescription: "Press F to pay respects for someone or something",
    optionalArgs: [
        {
            name: "reason",
            description: "What are you paying respects for?",
            type: "STRING",
            required: false
        }
    ],
    async execute(ctx: ContextAdapter) {
        const reason = ctx.getOption("reason", "string");

        const embed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle("Press F to Pay Respects 🎖️");

        if (reason) {
            const msg = await I18nService.t(ctx.guild?.id, "actions.f.withReason", { user: ctx.user.username, reason });
            embed.setDescription(msg);
        } else {
            const msg = await I18nService.t(ctx.guild?.id, "actions.f.default", { user: ctx.user.username });
            embed.setDescription(msg);
        }

        embed.setFooter({ text: await I18nService.t(ctx.guild?.id, "actions.f.footer") })
            .setTimestamp();

        await ctx.reply({ embeds: [embed] });
    }
};

export default FCommand;
