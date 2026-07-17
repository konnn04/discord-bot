import { ok, fail, type ActionResult, type ToolSchema } from '../types';

export interface GiftcodeEntry {
  code: string;
  rewards: string;
  status?: string;
}

export const GIFTCODE_GAMES = ['genshin', 'hkrpg', 'nap', 'honkai3rd', 'tot'];

export const giftcodeToolSchema: ToolSchema = {
  name: 'get_giftcode',
  description: 'Lấy giftcode mới nhất cho một game HoYoverse.',
  parameters: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        enum: GIFTCODE_GAMES,
        description: 'Mã game: genshin, hkrpg, nap, honkai3rd, tot',
      },
    },
    required: ['game'],
  },
};

export async function getGiftcodeAction(args: {
  game: string;
}): Promise<ActionResult<GiftcodeEntry[]>> {
  const game = String(args.game || 'genshin');
  if (!GIFTCODE_GAMES.includes(game)) {
    return fail(`Game không hợp lệ: ${game}`);
  }

  try {
    const res = await fetch(`https://hoyo-codes.seria.moe/codes?game=${game}`);
    const data: any = await res.json();
    const codes: GiftcodeEntry[] = (data?.codes ?? []).map((c: any) => ({
      code: c.code,
      rewards: c.rewards || '',
      status: c.status,
    }));
    if (!codes.length) {
      return ok(`Hiện không có giftcode cho ${game}.`, []);
    }
    const summary = codes
      .slice(0, 10)
      .map((c) => `${c.code} — ${c.rewards || 'phần thưởng không rõ'}`)
      .join('\n');
    return ok(summary, codes);
  } catch {
    return fail('Không lấy được giftcode lúc này.');
  }
}
