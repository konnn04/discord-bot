import { HOYOVERSE_GAME_IDS } from 'shared/src/types/settings.types';
import {
  HOYOVERSE_REDEEM_LINKS,
  type GiftcodeEntry,
} from '../../../giftcode/giftcode-notify';
import { ok, fail, type ActionResult, type ToolSchema } from '../types';

export const giftcodeToolSchema: ToolSchema = {
  name: 'get_giftcode',
  description: 'Lấy giftcode mới nhất cho một game HoYoverse.',
  parameters: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        enum: HOYOVERSE_GAME_IDS,
        description: `Mã game: ${HOYOVERSE_GAME_IDS.join(', ')}`,
      },
    },
    required: ['game'],
  },
};

/** Live lookup against the HoYoverse codes API — no caching/dedup (see michosgc.service.ts for that). */
export async function getGiftcodeAction(args: {
  game: string;
}): Promise<ActionResult<GiftcodeEntry[]>> {
  const game = String(args.game || 'genshin');
  if (!HOYOVERSE_GAME_IDS.includes(game)) {
    return fail(`Game không hợp lệ: ${game}`);
  }

  try {
    const res = await fetch(`https://hoyo-codes.seria.moe/codes?game=${game}`);
    const data: any = await res.json();
    const entries: GiftcodeEntry[] = (data?.codes ?? []).map((c: any) => ({
      code: c.code,
      rewards: c.rewards || undefined,
      link: HOYOVERSE_REDEEM_LINKS[game]?.(c.code),
    }));
    if (!entries.length) {
      return ok(`Hiện không có giftcode cho ${game}.`, []);
    }
    const summary = entries
      .slice(0, 10)
      .map((c) => `${c.code} — ${c.rewards || 'phần thưởng không rõ'}`)
      .join('\n');
    return ok(summary, entries);
  } catch {
    return fail('Không lấy được giftcode lúc này.');
  }
}
