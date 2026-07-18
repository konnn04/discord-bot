import {
  parseHtml,
  extractFromCards,
  extractFromListItems,
  extractFromTables,
  extractSelfText,
} from './extract-utils';

export interface GiftcodeCrawlSource {
  url: string;
  extract: (html: string) => string[];
}

/**
 * Per-game scrape sources, tried in order until one yields at least one code.
 * These games aren't covered by the michosgc HoYoverse API. Selectors mirror
 * the current page markup (as of setup) — expect to retune when a site
 * redesigns; see extract-utils.ts for the shared extraction heuristics.
 */
export const GIFTCODE_CRAWL_SOURCES: Record<string, GiftcodeCrawlSource[]> = {
  nte: [
    {
      url: 'https://www.ntegame.com/codes/',
      extract: (html) =>
        extractFromCards(parseHtml(html), { type: 'class', value: 'code-card' }),
    },
    {
      url: 'https://nevernessnte.org/codes/',
      extract: (html) =>
        extractFromCards(parseHtml(html), {
          type: 'class',
          value: 'glass rounded-xl p-4 flex items-start justify-between gap-3',
        }),
    },
  ],

  wuwa: [
    {
      url: 'https://wutheringwaves.gg/codes/',
      extract: (html) =>
        extractFromTables(parseHtml(html), {
          type: 'class',
          value: 'wp-block-table',
        }),
    },
  ],

  endfield: [
    {
      url: 'https://mobalytics.gg/arknights-endfield/guides/redemption-codes',
      extract: (html) =>
        extractFromTables(parseHtml(html), { type: 'tag', value: 'table' }),
    },
    {
      url: 'https://www.eurogamer.net/arknights-endfield-codes',
      extract: (html) =>
        extractSelfText(parseHtml(html), { type: 'class', value: 'copyable' }),
    },
  ],

  arknights: [
    {
      url: 'https://levelgeeks.net/arknights-codes/',
      extract: (html) =>
        extractFromListItems(parseHtml(html), {
          type: 'class',
          value: 'codes-list',
        }),
    },
  ],

  wwm: [
    {
      url: 'https://beebom.com/where-winds-meet-codes/',
      extract: (html) =>
        extractFromListItems(parseHtml(html), {
          type: 'class',
          value: 'wp-block-list',
          index: 0,
        }),
    },
  ],
};
