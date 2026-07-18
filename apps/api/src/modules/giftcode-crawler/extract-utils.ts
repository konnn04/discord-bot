import { parse, type HTMLElement } from 'node-html-parser';

/**
 * Heuristic extraction of gift-code-like tokens from scraped HTML text.
 * Game sites change markup often and vary wildly in structure, so this stays
 * intentionally simple — a token regex plus a noise-word blacklist — rather
 * than brittle per-site text parsing. Tune CODE_TOKEN_REGEX / NOISE_WORDS
 * here if a source starts producing junk or missing real codes.
 */
const CODE_TOKEN_REGEX = /\b[A-Z0-9]{4,24}\b/g;

/** Common words that otherwise match the token pattern but aren't codes. */
const NOISE_WORDS = new Set([
  'CODE', 'CODES', 'GIFT', 'GIFTS', 'REDEEM', 'REDEMPTION', 'ACTIVE',
  'EXPIRED', 'EXPIRE', 'NEW', 'LIST', 'UPDATE', 'UPDATED', 'LATEST',
  'WORKING', 'VALID', 'INVALID', 'FREE', 'REWARD', 'REWARDS', 'HOW', 'USE',
  'HERE', 'CLICK', 'COPY', 'COPIED', 'LINK', 'MORE', 'READ', 'ALL', 'NONE',
  'NULL', 'HTML', 'JAVASCRIPT', 'NOTE', 'GAME', 'GUIDE', 'GUIDES', 'PATCH',
  'VERSION', 'SERVER', 'GLOBAL', 'ANDROID', 'IOS', 'STEAM', 'PLAYSTATION',
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST',
  'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]);

function isPlausibleCode(token: string): boolean {
  if (NOISE_WORDS.has(token)) return false;
  // A short run of pure digits reads more like a year than a gift code.
  if (/^\d+$/.test(token) && token.length < 6) return false;
  return true;
}

/** Find every plausible code token in a blob of text, deduped, in order. */
export function extractCodeTokens(text: string): string[] {
  const matches = text.match(CODE_TOKEN_REGEX) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    if (seen.has(m) || !isPlausibleCode(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

/** The first plausible code token in a blob of text, if any. */
export function firstCodeToken(text: string): string | null {
  return extractCodeTokens(text)[0] ?? null;
}

export type SelectorSpec =
  | { type: 'class'; value: string; index?: number }
  | { type: 'tag'; value: string; index?: number };

function toCssSelector(spec: SelectorSpec): string {
  if (spec.type === 'tag') return spec.value;
  // Multi-class selectors like "glass rounded-xl p-4" become ".glass.rounded-xl.p-4"
  return spec.value
    .trim()
    .split(/\s+/)
    .map((c) => `.${c}`)
    .join('');
}

function select(root: HTMLElement, spec: SelectorSpec): HTMLElement[] {
  const all = root.querySelectorAll(toCssSelector(spec));
  if (spec.index == null) return all;
  const at = all[spec.index];
  return at ? [at] : [];
}

export function parseHtml(html: string): HTMLElement {
  return parse(html);
}

/** One code per matched "card" element — the first token in its full text. */
export function extractFromCards(
  root: HTMLElement,
  spec: SelectorSpec,
): string[] {
  const codes: string[] = [];
  for (const el of select(root, spec)) {
    const code = firstCodeToken(el.text);
    if (code) codes.push(code);
  }
  return [...new Set(codes)];
}

/** One code per `<li>` inside the matched container(s) (falls back to the container itself). */
export function extractFromListItems(
  root: HTMLElement,
  spec: SelectorSpec,
): string[] {
  const codes: string[] = [];
  for (const container of select(root, spec)) {
    const items = container.querySelectorAll('li');
    const targets = items.length > 0 ? items : [container];
    for (const item of targets) {
      const code = firstCodeToken(item.text);
      if (code) codes.push(code);
    }
  }
  return [...new Set(codes)];
}

/** One code per table row — the first `<td>` cell's text (header rows have none). */
export function extractFromTables(
  root: HTMLElement,
  spec: SelectorSpec,
): string[] {
  const codes: string[] = [];
  for (const container of select(root, spec)) {
    const table =
      container.tagName === 'TABLE' ? container : container.querySelector('table');
    if (!table) continue;
    for (const row of table.querySelectorAll('tr')) {
      const cell = row.querySelector('td');
      if (!cell) continue;
      const code = firstCodeToken(cell.text);
      if (code) codes.push(code);
    }
  }
  return [...new Set(codes)];
}

/** Each matched element IS (or directly contains) a code — use its own text. */
export function extractSelfText(
  root: HTMLElement,
  spec: SelectorSpec,
): string[] {
  const codes: string[] = [];
  for (const el of select(root, spec)) {
    const trimmed = el.text.trim().toUpperCase();
    const code =
      /^[A-Z0-9]{4,24}$/.test(trimmed) ? trimmed : firstCodeToken(el.text);
    if (code) codes.push(code);
  }
  return [...new Set(codes)];
}
