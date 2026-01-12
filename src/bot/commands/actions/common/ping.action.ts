import { ActionCommand } from "@shared/types/bot.types"
import { ContextAdapter } from "@bot/contexts/ContextAdapter";

import { I18nService } from "@services/I18nService";

const PingCommand: ActionCommand = {
    name: "ping",
    description: "Check the bot's latency.",
    helpDescription: "Use this command to check how responsive the bot is.",
    async execute(ctx: ContextAdapter) {
        const start = Date.now();
        await ctx.defer();
        
        const latency = Date.now() - start;
        const apiLatency = Math.round(ctx.client.ws.ping);
        
        const msg = await I18nService.t(ctx.guildId, 'ping.response', { latency, apiLatency });
        await ctx.editReply({ content: msg });
    },
};

export default PingCommand;