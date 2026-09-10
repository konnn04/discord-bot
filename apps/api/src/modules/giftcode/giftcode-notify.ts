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
/**
 * Builds embeds for giftcode notifications, chunking descriptions
 * into safe sizes (< 3500 characters) so that Discord's 4096 character limit
 * is never exceeded even for games with dozens of codes (e.g. WWM).
 */
export function buildGiftcodeEmbeds(
  gameLabel: string,
  codes: GiftcodeEntry[],
): EmbedBuilder[] {
  if (codes.length === 0) {
    return [
      new EmbedBuilder()
        .setTitle(`🎁 Mã quà tặng cho ${gameLabel}`)
        .setColor(0x22c55e)
        .setDescription('Hiện tại chưa có mã nào đang hoạt động.')
        .setFooter({ text: 'Kiểm tra hạn dùng trước khi nhập mã.' })
        .setTimestamp(),
    ];
  }

  // Format each code into a neat markdown block
  const blocks = codes.map((c) => {
    const codeText = c.link
      ? `**[${c.code}](${c.link})**`
      : `**\`${c.code}\`**`;
    return c.rewards ? `${codeText}\n└ 🎁 ${c.rewards}` : codeText;
  });

  // Split into chunks under 3500 characters
  const chunks: string[] = [];
  let current = '';

  for (const block of blocks) {
    const sep = current ? '\n\n' : '';
    if ((current + sep + block).length > 3500) {
      if (current) chunks.push(current);
      current = block;
    } else {
      current += sep + block;
    }
  }
  if (current) chunks.push(current);

  const totalParts = chunks.length;
  return chunks.map((desc, idx) => {
    const partSuffix = totalParts > 1 ? ` (Phần ${idx + 1}/${totalParts})` : '';
    const embed = new EmbedBuilder()
      .setTitle(`🎁 Mã quà tặng mới cho ${gameLabel}!${partSuffix}`)
      .setColor(0x22c55e)
      .setDescription(desc);

    if (idx === totalParts - 1) {
      embed
        .setFooter({ text: 'Kiểm tra hạn dùng trước khi nhập mã.' })
        .setTimestamp();
    }
    return embed;
  });
}

/**
 * Backward-compatible single embed builder (returns the first embed chunk).
 */
export function buildGiftcodeEmbed(
  gameLabel: string,
  codes: GiftcodeEntry[],
): EmbedBuilder {
  return buildGiftcodeEmbeds(gameLabel, codes)[0];
}

/**
 * In-memory tracking of which hash a guild has already been notified for.
 * Key: `${guildId}:${gameId}` -> hash
 */
const guildNotifiedHashes = new Map<string, string>();

/**
 * Send codes for one game to every guild that opted into it, respecting
 * the guild's tag mode ('common' role for everything, or 'perGame' role).
 * Shared by michosgc.service.ts and giftcode-crawler.service.ts so both
 * backends notify guilds the exact same way.
 *
 * When `options.currentHash` is provided, tracks delivery per guild so that:
 * 1. New codes trigger notifications for all subscribed guilds.
 * 2. Newly enabled guilds receive active codes immediately upon enabling.
 * 3. Already-notified guilds are not spammed repeatedly with identical codes.
 */
export async function notifyGuildsForGiftcode(
  client: Client,
  guildSettings: GuildSettingsService,
  gameId: string,
  gameLabel: string,
  codes: GiftcodeEntry[],
  options?: { currentHash?: string; force?: boolean },
): Promise<void> {
  if (codes.length === 0) return;

  for (const [guildId, settings] of guildSettings.getAll().entries()) {
    const config = settings.giftcode;
    if (!config?.enabled || !config.channelId) continue;
    if (!config.games?.includes(gameId)) continue;

    // Skip if this guild was already notified for this exact code hash
    const hashKey = `${guildId}:${gameId}`;
    if (!options?.force && options?.currentHash) {
      const lastHash = guildNotifiedHashes.get(hashKey);
      if (lastHash === options.currentHash) continue;
    }

    try {
      const channel = await client.channels.fetch(config.channelId);
      if (!channel || !channel.isTextBased()) continue;

      const embeds = buildGiftcodeEmbeds(gameLabel, codes);
      const roleId =
        config.mode === 'perGame' ? config.roles?.[gameId] : config.roleCommon;
      const content = roleId ? `<@&${roleId}>` : undefined;

      // Discord allows max 10 embeds per message. Send in batches of up to 10.
      for (let i = 0; i < embeds.length; i += 10) {
        const batch = embeds.slice(i, i + 10);
        await (channel as any).send({
          content: i === 0 ? content : undefined,
          embeds: batch,
        });
      }

      if (options?.currentHash) {
        guildNotifiedHashes.set(hashKey, options.currentHash);
      }
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
