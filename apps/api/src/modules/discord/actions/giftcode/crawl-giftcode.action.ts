import { GIFTCODE_CRAWL_GAMES } from 'shared/src/types/settings.types';
import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

const GAME_IDS = GIFTCODE_CRAWL_GAMES.map((g) => g.id);

export const crawlGiftcodeToolSchema: ToolSchema = {
  name: 'crawl_giftcode',
  description:
    'Cào giftcode mới nhất ngay lập tức cho một game KHÔNG thuộc HoYoverse ' +
    '(NTE, Wuthering Waves, Arknights, Arknights: Endfield, Where Winds Meet). ' +
    'Dùng get_giftcode thay vào đó cho game HoYoverse (Genshin, HSR, ZZZ...).',
  parameters: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        enum: GAME_IDS,
        description: `Mã game: ${GAME_IDS.join(', ')}`,
      },
    },
    required: ['game'],
  },
};

export interface CrawlGiftcodeData {
  codes: string[];
}

/** On-demand crawl for a single non-HoYoverse game. Shares GiftcodeCrawlerService with the 30-min schedule. */
export async function crawlGiftcodeAction(
  ctx: ActionContext,
  args: { game: string },
): Promise<ActionResult<CrawlGiftcodeData>> {
  const gameId = String(args.game || '');
  const meta = GIFTCODE_CRAWL_GAMES.find((g) => g.id === gameId);
  if (!meta) return fail(`Game không hỗ trợ: ${gameId}`);

  const result = await ctx.deps.giftcodeCrawler.crawlGameNow(gameId);
  if (!result || result.codes.length === 0) {
    return fail(`Hiện chưa cào được giftcode nào cho ${meta.label}.`);
  }

  const summary = result.codes.map((c) => `\`${c}\``).join(', ');
  return ok(`Giftcode ${meta.label}: ${summary}`, { codes: result.codes });
}
