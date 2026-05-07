import { PermissionLevel } from 'shared/src/types/discord.types';
import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import type { GuildSettingsService } from '../../../settings/guild-settings.service';
import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';

function statusEmbed(settings: any): EmbedBuilder {
  const w = settings.welcome || {};
  const f = settings.features || {};
  const on = f.welcome === true;

  return new EmbedBuilder()
    .setColor(on ? 0x10b981 : 0x6b7280)
    .setTitle('👋 Welcome System')
    .setDescription(
      `**Trạng thái:** ${on ? '✅ Bật' : '❌ Tắt'}\n` +
        `**Kênh:** ${w.channelId ? `<#${w.channelId}>` : 'chưa đặt'}\n` +
        `**Message:** \`${w.message || '(mặc định)'}\`\n\n` +
        `*Biến hỗ trợ:* \`{user}\`, \`{user.mention}\`, \`{server}\`, \`{memberCount}\``,
    );
}

function buttons(on: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('welcome_toggle')
      .setEmoji(on ? '❌' : '✅')
      .setLabel(on ? 'Tắt' : 'Bật')
      .setStyle(on ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('welcome_channel')
      .setEmoji('📢')
      .setLabel('Đặt kênh')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('welcome_msg')
      .setEmoji('✏️')
      .setLabel('Sửa message')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('welcome_test')
      .setEmoji('🔍')
      .setLabel('Test')
      .setStyle(ButtonStyle.Secondary),
  );
}

const welcomeSetting: ActionCommand = {
  name: 'setting_welcome',
  description: 'Cấu hình hệ thống chào mừng thành viên mới',
  category: 'settings',
  permission: PermissionLevel.ADMIN,

  async execute(ctx: ContextAdapter, deps?: any) {
    const gs = deps?.guildSettings as GuildSettingsService | undefined;
    if (!gs || !ctx.guildId) {
      await ctx.reply('❌ Hệ thống chưa sẵn sàng.');
      return;
    }

    await ctx.defer();

    const settings = gs.get(ctx.guildId);
    const on = settings.features.welcome === true;

    const msg = await ctx.editReply({
      embeds: [statusEmbed(gs.get(ctx.guildId))],
      components: [buttons(on)],
    });

    const attachCollector = (message: typeof msg) => {
      const col = message.createMessageComponentCollector({ time: 120_000 });

      col.on('collect', async (i) => {
        if (i.user.id !== ctx.userId) {
          await i.reply({
            content: '❌ Nút này không dành cho bạn.',
            flags: 64,
          });
          return;
        }

        const cid = i.customId;
        let refreshed = false;

        if (cid === 'welcome_toggle') {
          const cur = gs.get(ctx.guildId!);
          gs.update(ctx.guildId!, {
            features: { ...cur.features, welcome: !cur.features.welcome },
          });
          refreshed = true;
        }

        if (cid === 'welcome_channel') {
          const sel = new ChannelSelectMenuBuilder()
            .setCustomId('welcome_ch_sel')
            .setPlaceholder('Chọn kênh chào mừng...')
            .setChannelTypes(ChannelType.GuildText);
          await i.update({
            components: [
              new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                sel,
              ),
            ],
          });
          return;
        }

        if (cid === 'welcome_msg') {
          const modal = new ModalBuilder()
            .setCustomId('welcome_modal')
            .setTitle('Sửa Welcome Message');
          const input = new TextInputBuilder()
            .setCustomId('welcome_text')
            .setLabel('Message (biến: {user}, {server}, {memberCount})')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(
              settings.welcome.message ||
                '👋 Chào mừng {user.mention} đến với **{server}**! (#{memberCount})',
            )
            .setMaxLength(1000);
          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(input),
          );
          await i.showModal(modal);

          const submitted = await i
            .awaitModalSubmit({ time: 60_000 })
            .catch(() => null);
          if (submitted) {
            await submitted.deferUpdate();
            const text = submitted.fields.getTextInputValue('welcome_text');
            gs.update(ctx.guildId!, {
              welcome: { ...gs.get(ctx.guildId!).welcome, message: text },
            });
            await submitted.editReply({
              embeds: [statusEmbed(gs.get(ctx.guildId!))],
              components: [buttons(gs.get(ctx.guildId!).features.welcome)],
            });
          }
          return;
        }

        if (cid === 'welcome_test') {
          const cur = gs.get(ctx.guildId!);
          const chId = cur.welcome.channelId;
          if (!chId) {
            await i.reply({ content: '❌ Chưa đặt kênh welcome.', flags: 64 });
            return;
          }
          const ch = ctx.client.channels.cache.get(chId);
          if (ch && ch.isTextBased()) {
            const msgText = (
              cur.welcome.message ||
              '👋 Chào mừng {user.mention} đến với **{server}**!'
            )
              .replace(/\{user\}/g, ctx.author.username)
              .replace(/\{user\.mention\}/g, `<@${ctx.userId}>`)
              .replace(/\{server\}/g, ctx.guild?.name || 'Server')
              .replace(/\{memberCount\}/g, String(ctx.guild?.memberCount || 1));
            await (ch as any).send({
              embeds: [
                new EmbedBuilder().setColor(0x10b981).setDescription(msgText),
              ],
            });
            await i.reply({ content: '✅ Đã gửi test.', flags: 64 });
          } else {
            await i.reply({ content: '❌ Kênh không tồn tại.', flags: 64 });
          }
          return;
        }

        if (cid === 'welcome_ch_sel') {
          const chId = (i as any).values?.[0];
          if (chId) {
            gs.update(ctx.guildId!, {
              welcome: { ...gs.get(ctx.guildId!).welcome, channelId: chId },
            });
            refreshed = true;
          }
        }

        if (refreshed) {
          const cur = gs.get(ctx.guildId!);
          await i.update({
            embeds: [statusEmbed(cur)],
            components: [buttons(cur.features.welcome)],
          });
          col.stop();
          attachCollector(msg);
        }
      });

      col.on('end', async () => {
        try {
          await msg.edit({ components: [] }).catch(() => {});
        } catch {
          /* deleted */
        }
      });
    };

    attachCollector(msg);
  },
};

export default welcomeSetting;
