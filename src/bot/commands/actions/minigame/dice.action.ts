import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder } from "discord.js";

const diceEmojis = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const DiceCommand: ActionCommand = {
    name: "dice",
    description: "Roll a 6-sided die",
    helpDescription: "Roll a standard 6-sided die and see what number you get!",
    async execute(ctx: ContextAdapter) {
        const result = Math.floor(Math.random() * 6) + 1;
        const emoji = diceEmojis[result - 1];

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🎲 Dice Roll")
            .setDescription(`${emoji}\n\nYou rolled a **${result}**!`)
            .setFooter({ text: `Rolled by ${ctx.user.username}` })
            .setTimestamp();

        await ctx.reply({ embeds: [embed] });
    },
};

export default DiceCommand;
