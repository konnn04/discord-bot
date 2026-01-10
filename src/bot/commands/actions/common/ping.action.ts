import { ActionCommand } from "@shared/types/bot.types"
import { ContextAdapter } from "@bot/contexts/ContextAdapter";

const PingCommand: ActionCommand = {
    name: "ping",
    description: "Check the bot's latency.",
    helpDescription: "Use this command to check how responsive the bot is.",
    async execute(ctx: ContextAdapter) {
        const start = Date.now();
        await ctx.defer();
        
        const latency = Date.now() - start;
        const apiLatency = Math.round(ctx.client.ws.ping);

        await ctx.editReply({
            content: `Pong! 🏓\nLatency: ${latency}ms\nAPI Latency: ${apiLatency}ms`
        });
    },
};

export default PingCommand;