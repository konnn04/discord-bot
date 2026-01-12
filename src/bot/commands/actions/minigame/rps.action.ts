import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder } from "discord.js";
import { BotClient } from "@bot/types/bot.types";

type RPSChoice = "rock" | "paper" | "scissors";

const choices: RPSChoice[] = ["rock", "paper", "scissors"];

const emojis: Record<RPSChoice, string> = {
    rock: "🪨",
    paper: "📄",
    scissors: "✂️"
};

const determineWinner = (playerChoice: RPSChoice, botChoice: RPSChoice): "win" | "lose" | "tie" => {
    if (playerChoice === botChoice) return "tie";
    if (
        (playerChoice === "rock" && botChoice === "scissors") ||
        (playerChoice === "paper" && botChoice === "rock") ||
        (playerChoice === "scissors" && botChoice === "paper")
    ) {
        return "win";
    }
    return "lose";
};

const RPSCommand: ActionCommand = {
    name: "rps",
    description: "Play Rock Paper Scissors with the bot",
    helpDescription: "Play a game of Rock Paper Scissors against the bot. Win to increase your streak!",
    isOnlySlashCommand: true,
    optionalArgs: [
        {
            name: "choice",
            description: "Your choice: rock, paper, or scissors",
            type: "STRING",
            required: true,
            choices: [
                { name: "🪨 Rock", value: "rock" },
                { name: "📄 Paper", value: "paper" },
                { name: "✂️ Scissors", value: "scissors" }
            ]
        }
    ],
    async execute(ctx: ContextAdapter) {
        const client = ctx.client as BotClient;
        const playerChoice = ctx.getOption("choice", "string") as RPSChoice;
        const botChoice = choices[Math.floor(Math.random() * choices.length)];

        if (!client.rpsStreaks) {
            client.rpsStreaks = new Map();
        }

        const userId = ctx.user.id;
        const currentStreak = client.rpsStreaks.get(userId) || 0;
        const result = determineWinner(playerChoice, botChoice);

        let newStreak = currentStreak;
        let color = 0x5865F2;
        let resultText = "";

        if (result === "win") {
            newStreak = currentStreak + 1;
            color = 0x57F287;
            resultText = "🎉 You Win!";
        } else if (result === "lose") {
            newStreak = 0;
            color = 0xED4245;
            resultText = "😢 You Lose!";
        } else {
            color = 0xFEE75C;
            resultText = "🤝 It's a Tie!";
        }

        client.rpsStreaks.set(userId, newStreak);

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle("🎮 Rock Paper Scissors")
            .addFields(
                { name: "Your Choice", value: `${emojis[playerChoice]} ${playerChoice.toUpperCase()}`, inline: true },
                { name: "Bot's Choice", value: `${emojis[botChoice]} ${botChoice.toUpperCase()}`, inline: true },
                { name: "Result", value: resultText, inline: false },
                { name: "Win Streak", value: `🔥 ${newStreak} ${newStreak === 1 ? "win" : "wins"}`, inline: false }
            )
            .setFooter({ text: `${ctx.user.username}'s game` })
            .setTimestamp();

        if (newStreak > currentStreak && newStreak >= 3) {
            embed.setDescription(`🔥 Amazing! You're on a ${newStreak}-win streak!`);
        } else if (result === "lose" && currentStreak > 0) {
            embed.setDescription(`Your ${currentStreak}-win streak has ended. Better luck next time!`);
        }

        await ctx.reply({ embeds: [embed] });
    },
};

export default RPSCommand;
