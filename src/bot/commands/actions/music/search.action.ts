import { ActionCommand } from '@src/shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { MusicService } from '@services/MusicService';
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } from 'discord.js';

export const searchAction: ActionCommand = {
  name: 'search',
  description: 'Search for a song',
  helpDescription: 'Searches for a song and provides a menu to select which one to play.',
  optionalArgs: [
      {
          name: 'query',
          description: 'Song to search for',
          type: 'STRING',
          required: true
      }
  ],
  async execute(ctx: ContextAdapter) {
    if (!ctx.guildId) return;
    const query = ctx.getOption('query', 'string') as string;
    const { I18nService } = await import("@services/I18nService");

    await ctx.defer();
    const results = await MusicService.search(query);

    if (!results || results.length === 0) {
        await ctx.editReply(await I18nService.t(ctx.guildId, 'music.searchNoResults'));
        return;
    }

    const select = new StringSelectMenuBuilder()
			.setCustomId('music_search_select')
			.setPlaceholder(await I18nService.t(ctx.guildId, 'music.searchSelect'))
			.addOptions(
				results.slice(0, 10).map((video: any, index: number) => 
					new StringSelectMenuOptionBuilder()
						.setLabel((video.title || 'Unknown').substring(0, 100))
						.setDescription((video.artist || video.author?.name || 'Unknown Artist').substring(0, 100))
						.setValue(video.url)
                        .setEmoji('🎵')
				)
			);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(select);

    const response = await ctx.editReply({
			content: await I18nService.t(ctx.guildId, 'music.searchResults', { query }),
			components: [row],
    });

    try {
        const selection = await response.awaitMessageComponent({ 
            componentType: ComponentType.StringSelect, 
            time: 30000,
            filter: (i) => i.user.id === ctx.user.id
        });

        const url = selection.values[0];
        
        await selection.update({ content: await I18nService.t(ctx.guildId, 'music.searchSelected'), components: [] });
        
        await MusicService.play(
            ctx.guild!, 
            ctx.member?.voice?.channel as any, 
            ctx.channel as any, 
            url, 
            ctx.user
        );

    } catch (e) {
        await ctx.editReply({ content: await I18nService.t(ctx.guildId, 'music.searchTimeout'), components: [] });
    }
  },
};

export default searchAction;
