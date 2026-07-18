import { Client, EmbedBuilder } from 'discord.js';
import type { GuildSettingsService } from '../settings/guild-settings.service';
import { GIFTCODE_GAMES } from 'shared/src/types/settings.types';

export interface GiftcodeEntry {
  code: string;
  rewards?: string;
  link?: string;
}

/** Display label for a game id, from the shared registry. */
export function giftcodeGameLabel(gameId: string): string {
  return GIFTCODE_GAMES.find((g) => g.id === gameId)?.label ?? gameId;
}

/**
 * Per-code redemption deep links for the HoYoverse games that support one.
 * Games without an entry here (e.g. Honkai Impact 3rd, Tears of Themis) have
 * no official code-in-URL redemption page — codes are shown without a link.
 */
export const HOYOVERSE_REDEEM_LINKS: Record<string, (code: string) => string> = {
  genshin: (code) => `https://genshin.hoyoverse.com/vi/gift?code=${code}`,
  hkrpg: (code) => `https://hsr.hoyoverse.com/gift?code=${code}`,
  nap: (code) => `https://zenless.hoyoverse.com/redemption?code=${code}`,
};

/**
 * One consistent embed format for every game's giftcode notification,
 * regardless of whether the codes came from the HoYoverse API (michosgc) or
 * the web crawler.
 */
export function buildGiftcodeEmbed(
  gameLabel: string,
  codes: GiftcodeEntry[],
): EmbedBuilder {
  const desc = codes
    .map((c) => {
      const codeText = c.link
        ? `**[${c.code}](${c.link})**`
        : `**\`${c.code}\`**`;
      return c.rewards ? `${codeText}\n└ 🎁 ${c.rewards}` : codeText;
    })
    .join('\n\n');

  return new EmbedBuilder()
    .setTitle(`🎁 Mã quà tặng mới cho ${gameLabel}!`)
    .setColor(0x22c55e)
    .setDescription(desc)
    .setFooter({ text: 'Kiểm tra hạn dùng trước khi nhập mã.' })
    .setTimestamp();
}

/**
 * Send new codes for one game to every guild that opted into it, respecting
 * the guild's tag mode ('common' role for everything, or 'perGame' role).
 * Shared by michosgc.service.ts and giftcode-crawler.service.ts so both
 * backends notify guilds the exact same way.
 */
export async function notifyGuildsForGiftcode(
  client: Client,
  guildSettings: GuildSettingsService,
  gameId: string,
  gameLabel: string,
  codes: GiftcodeEntry[],
): Promise<void> {
  if (codes.length === 0) return;

  for (const [guildId, settings] of guildSettings.getAll().entries()) {
    const config = settings.giftcode;
    if (!config?.enabled || !config.channelId) continue;
    if (!config.games?.includes(gameId)) continue;

    try {
      const channel = await client.channels.fetch(config.channelId);
      if (!channel || !channel.isTextBased()) continue;

      const embed = buildGiftcodeEmbed(gameLabel, codes);
      const roleId =
        config.mode === 'perGame' ? config.roles?.[gameId] : config.roleCommon;
      const content = roleId ? `<@&${roleId}>` : undefined;

      await (channel as any).send({ content, embeds: [embed] });
    } catch (err) {
      console.error(
        `[giftcode] Failed to notify guild ${guildId} for ${gameId}:`,
        err,
      );
    }
  }
}

/** The set of game ids at least one guild has enabled notifications for. */
export function getActiveGiftcodeGameIds(
  guildSettings: GuildSettingsService,
): Set<string> {
  const active = new Set<string>();
  for (const settings of guildSettings.getAll().values()) {
    const config = settings.giftcode;
    if (!config?.enabled || !config.channelId) continue;
    for (const gameId of config.games ?? []) active.add(gameId);
  }
  return active;
}
