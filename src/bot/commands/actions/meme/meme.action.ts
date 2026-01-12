import { ActionCommand } from "@shared/types/bot.types";
import { ContextAdapter } from "@bot/contexts/ContextAdapter";
import { EmbedBuilder } from "discord.js";
import axios from "axios";
import { I18nService } from "@services/I18nService";

const MemeCommand: ActionCommand = {
    name: "meme",
    description: "Get a random meme! 🤣",
    helpDescription: "Fetches a random meme from Reddit",
    optionalArgs: [
        {
            name: "subreddit",
            description: "Choose meme subreddit",
            type: "STRING",
            required: false,
            choices: [
                { name: "r/memes", value: "memes" },
                { name: "r/dankmemes", value: "dankmemes" },
                { name: "r/wholesomememes", value: "wholesomememes" },
                { name: "r/animemes", value: "Animemes" },
                { name: "Random", value: "random" }
            ]
        }
    ],
    async execute(ctx: ContextAdapter) {
        await ctx.defer();

        try {
            const subredditChoice = ctx.getOption("subreddit", "string") || "random";
            
            const subreddits = ["memes", "dankmemes", "wholesomememes", "Animemes", "me_irl"];
            const targetSubreddit = subredditChoice === "random" 
                ? subreddits[Math.floor(Math.random() * subreddits.length)]
                : subredditChoice;

            // Use meme-api or Reddit JSON API
            let memeData: any;
            
            try {
                // Try meme-api first
                const response = await axios.get(`https://meme-api.com/gimme/${targetSubreddit}`);
                memeData = response.data;
            } catch {
                // Fallback to direct Reddit JSON
                const response = await axios.get(`https://www.reddit.com/r/${targetSubreddit}/random.json`);
                const post = response.data[0].data.children[0].data;
                memeData = {
                    title: post.title,
                    url: post.url,
                    postLink: `https://reddit.com${post.permalink}`,
                    subreddit: post.subreddit,
                    author: post.author,
                    ups: post.ups
                };
            }

            const embed = new EmbedBuilder()
                .setColor(0xFF4500)
                .setTitle(memeData.title || await I18nService.t(ctx.guild?.id, "actions.meme.title"))
                .setURL(memeData.postLink || memeData.url)
                .setImage(memeData.url)
                .setFooter({ 
                    text: `r/${memeData.subreddit} • 👍 ${memeData.ups || 0} • By u/${memeData.author || "unknown"}` 
                })
                .setTimestamp();

            await ctx.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[ERROR] Failed to fetch meme:", error);
            await ctx.editReply({ content: await I18nService.t(ctx.guild?.id, "actions.meme.fail") });
        }
    }
};

export default MemeCommand;
