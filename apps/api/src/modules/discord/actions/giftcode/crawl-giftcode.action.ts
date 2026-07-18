import { GIFTCODE_GAMES } from 'shared/src/types/settings.types';
import { GIFTCODE_CRAWL_SOURCES } from '../../../giftcode-crawler/sources';
import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

/** Games this action can crawl on-demand — the web-scraped ones, not HoYoverse. */
const GAME_IDS = Object.keys(GIFTCODE_CRAWL_SOURCES);

function labelFor(gameId: string): string {
  return GIFTCODE_GAMES.find((g) => g.id === gameId)?.label ?? gameId;
}

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
  if (!GAME_IDS.includes(gameId)) return fail(`Game không hỗ trợ: ${gameId}`);

  const label = labelFor(gameId);
  const result = await ctx.deps.giftcodeCrawler.crawlGameNow(gameId);
  if (!result || result.codes.length === 0) {
    return fail(`Hiện chưa cào được giftcode nào cho ${label}.`);
  }

  const summary = result.codes.map((c) => `\`${c}\``).join(', ');
  return ok(`Giftcode ${label}: ${summary}`, { codes: result.codes });
}
