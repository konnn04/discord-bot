import {
  GIFTCODE_GAMES,
  HOYOVERSE_GAME_IDS,
} from 'shared/src/types/settings.types';
import {
  HOYOVERSE_REDEEM_LINKS,
  giftcodeGameLabel,
  type GiftcodeEntry,
} from '../../../giftcode/giftcode-notify';
import { GIFTCODE_CRAWL_SOURCES } from '../../../giftcode-crawler/sources';
import { ok, fail, type ActionResult, type ToolSchema } from '../types';

const ALL_GAME_IDS = GIFTCODE_GAMES.map((g) => g.id);

export const giftcodeToolSchema: ToolSchema = {
  name: 'get_giftcode',
  description:
    'Lấy danh sách giftcode mới nhất của mọi game được hỗ trợ (HoYoverse: Genshin, HSR, ZZZ... và các game khác: NTE, WuWa, Arknights, WWM).',
  parameters: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        enum: ALL_GAME_IDS,
        description: `Mã game: ${ALL_GAME_IDS.join(', ')}`,
      },
    },
    required: ['game'],
  },
};

const FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Lookup giftcode for ANY supported game — HoYoverse via API, other games via crawler sources. */
export async function getGiftcodeAction(args: {
  game: string;
}): Promise<ActionResult<GiftcodeEntry[]>> {
  const game = String(args.game || 'genshin').toLowerCase();
  const label = giftcodeGameLabel(game);

  if (!ALL_GAME_IDS.includes(game)) {
    return fail(`Game không hợp lệ hoặc chưa được hỗ trợ: "${game}".`);
  }

  // 1. HoYoverse games via API
  if (HOYOVERSE_GAME_IDS.includes(game)) {
    try {
      const res = await fetch(
        `https://hoyo-codes.seria.moe/codes?game=${game}`,
      );
      if (!res.ok)
        return fail(`API trả về lỗi ${res.status} khi lấy giftcode ${label}.`);
      const data: any = await res.json();
      const entries: GiftcodeEntry[] = (data?.codes ?? []).map((c: any) => ({
        code: c.code,
        rewards: c.rewards || undefined,
        link: HOYOVERSE_REDEEM_LINKS[game]?.(c.code),
      }));
      if (!entries.length) {
        return ok(`Hiện không có giftcode nào khả dụng cho ${label}.`, []);
      }
      const summary = entries
        .slice(0, 10)
        .map((c) => `${c.code} — ${c.rewards || 'phần thưởng'}`)
        .join('\n');
      return ok(`Giftcode ${label}:\n${summary}`, entries);
    } catch {
      return fail(`Không thể lấy giftcode cho ${label} lúc này.`);
    }
  }

  // 2. Non-HoYoverse games via web crawler sources
  const sources = GIFTCODE_CRAWL_SOURCES[game];
  if (!sources || sources.length === 0) {
    return fail(`Chưa có nguồn lấy giftcode cho game ${label}.`);
  }

  let entries: GiftcodeEntry[] = [];
  let sourceUrl: string | undefined;

  for (const src of sources) {
    try {
      const res = await fetch(src.url, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      entries = src.extract(html);
      if (entries.length > 0) {
        sourceUrl = src.url;
        break;
      }
    } catch {
      // try next source
    }
  }

  if (entries.length === 0) {
    return ok(`Hiện chưa tìm thấy giftcode hoạt động nào cho ${label}.`, []);
  }

  const entriesWithLink = entries.map((e) => ({ ...e, link: sourceUrl }));
  const summary = entriesWithLink
    .slice(0, 10)
    .map((c) => `${c.code}${c.rewards ? ` — ${c.rewards}` : ''}`)
    .join('\n');

  return ok(`Giftcode ${label}:\n${summary}`, entriesWithLink);
}
