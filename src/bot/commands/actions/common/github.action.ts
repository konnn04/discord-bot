import { ActionCommand } from '@src/shared/types/bot.types';
import { EmbedBuilder } from 'discord.js';

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
}

const githubCommand: ActionCommand = {
  name: 'github',
  description: 'Get GitHub user information',
  optionalArgs: [
    {
      name: 'username',
      description: 'The GitHub username to lookup',
      type: 'STRING',
      required: true,
    }
  ],
  cooldown: 10,
  execute: async (ctx, args) => {
    const username = args?.username as string;

    if (!username) {
      await ctx.reply('Please provide a username.');
      return;
    }

    try {
      const response = await fetch(`https://api.github.com/users/${username}`);

      if (!response.ok) {
        if (response.status === 404) {
          await ctx.reply(`❌ User **${username}** not found on GitHub.`);
        } else {
          await ctx.reply(`❌ Failed to fetch GitHub data. API Error: ${response.statusText}`);
        }
        return;
      }

      const data = (await response.json()) as GitHubUser;

      const embed = new EmbedBuilder()
        .setColor('#333333') 
        .setTitle(data.name || data.login)
        .setURL(data.html_url)
        .setDescription(data.bio || 'No bio provided.')
        .setThumbnail(data.avatar_url)
        .addFields(
          { name: '👤 Username', value: `[${data.login}](${data.html_url})`, inline: true },
          { name: '📦 Repos', value: data.public_repos.toLocaleString(), inline: true },
          { name: '👥 Followers', value: data.followers.toLocaleString(), inline: true },
          { name: '👣 Following', value: data.following.toLocaleString(), inline: true },
        );

      if (data.company) {
        embed.addFields({ name: '🏢 Company', value: data.company, inline: true });
      }
      if (data.location) {
        embed.addFields({ name: '📍 Location', value: data.location, inline: true });
      }
      if (data.blog) {
        let blogUrl = data.blog;
        if (!blogUrl.startsWith('http')) blogUrl = `https://${blogUrl}`;
        embed.addFields({ name: '🔗 Website', value: `[Link](${blogUrl})`, inline: true });
      }
      if (data.twitter_username) {
         embed.addFields({ name: '🐦 Twitter', value: `[@${data.twitter_username}](https://twitter.com/${data.twitter_username})`, inline: true });
      }

      const createdDate = new Date(data.created_at).toLocaleDateString();
      embed.setFooter({ text: `Joined GitHub on ${createdDate}`, iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' });

      await ctx.reply({ embeds: [embed] });

    } catch (error) {
      console.error('[Command] GitHub Error:', error);
      await ctx.reply('❌ An error occurred while fetching GitHub data.');
    }
  },
};

export default githubCommand;
