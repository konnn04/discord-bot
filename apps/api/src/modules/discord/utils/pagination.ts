import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  InteractionResponse,
  ComponentType,
} from 'discord.js';

export async function paginate(
  messageOrInteraction: Message | InteractionResponse,
  pages: EmbedBuilder[],
  userId: string,
  timeout = 60000,
  startPage = 0,
): Promise<void> {
  if (!pages || pages.length === 0) return;
  if (pages.length === 1) {
    if ('edit' in messageOrInteraction) {
      await messageOrInteraction.edit({ embeds: [pages[0]], components: [] });
    }
    return;
  }

  let currentPage = Math.min(Math.max(0, startPage), pages.length - 1);

  const generateComponents = () => {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('page_first')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('page_prev')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId('page_next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === pages.length - 1),
      new ButtonBuilder()
        .setCustomId('page_last')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === pages.length - 1),
    );
  };

  const updateMessage = async () => {
    const embed = pages[currentPage].setFooter({
      text: `Trang ${currentPage + 1} / ${pages.length}`,
    });
    if ('edit' in messageOrInteraction) {
      await messageOrInteraction.edit({
        embeds: [embed],
        components: [generateComponents()],
      });
    }
  };

  await updateMessage();

  const msg =
    'fetch' in messageOrInteraction
      ? await (messageOrInteraction as any).fetch()
      : messageOrInteraction;

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeout,
  });

  collector.on('collect', async (i: any) => {
    if (i.user.id !== userId) {
      await i.reply({
        content: 'Bạn không thể sử dụng nút của người khác!',
        flags: 64, // MessageFlags.Ephemeral
      });
      return;
    }

    await i.deferUpdate();

    if (i.customId === 'page_first') {
      currentPage = 0;
    } else if (i.customId === 'page_prev') {
      currentPage = Math.max(0, currentPage - 1);
    } else if (i.customId === 'page_next') {
      currentPage = Math.min(pages.length - 1, currentPage + 1);
    } else if (i.customId === 'page_last') {
      currentPage = pages.length - 1;
    }

    await updateMessage();
  });

  collector.on('end', async () => {
    try {
      const embed = pages[currentPage].setFooter({
        text: `Trang ${currentPage + 1} / ${pages.length}`,
      });
      if ('edit' in messageOrInteraction) {
        await messageOrInteraction.edit({
          embeds: [embed],
          components: [],
        });
      }
    } catch {
      /* ignore */
    }
  });
}
