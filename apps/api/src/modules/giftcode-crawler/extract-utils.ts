import { parse, type HTMLElement } from 'node-html-parser';
import type { GiftcodeEntry } from '../giftcode/giftcode-notify';

/**
 * Heuristic extraction of gift-code-like tokens (and their nearby reward
 * text) from scraped HTML text. Game sites change markup often and vary
 * wildly in structure, so this stays intentionally simple — a token regex
 * plus a noise-word blacklist — rather than brittle per-site text parsing.
 * Tune CODE_TOKEN_REGEX / NOISE_WORDS here if a source starts producing junk
 * or missing real codes.
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

const REWARD_MAX_LENGTH = 140;

/**
 * Best-effort reward description: the given text with the code token (and
 * common leftover separators like "-", ":", "|") stripped out. Returns
 * undefined when what's left is too short to be meaningful.
 */
export function extractRewardNear(text: string, code: string): string | undefined {
  const withoutCode = text.replace(code, ' ').replace(/\s+/g, ' ').trim();
  const cleaned = withoutCode.replace(/^[-:|–—•\s]+|[-:|–—•\s]+$/g, '').trim();
  if (cleaned.length < 3) return undefined;
  return cleaned.length > REWARD_MAX_LENGTH
    ? `${cleaned.slice(0, REWARD_MAX_LENGTH - 1)}…`
    : cleaned;
}

/** Dedupe entries by code, keeping the first occurrence's reward text. */
function dedupeByCode(entries: GiftcodeEntry[]): GiftcodeEntry[] {
  const seen = new Set<string>();
  const out: GiftcodeEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.code)) continue;
    seen.add(e.code);
    out.push(e);
  }
  return out;
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

/** One entry per matched "card" element — code + the rest of its text as the reward. */
export function extractFromCards(
  root: HTMLElement,
  spec: SelectorSpec,
): GiftcodeEntry[] {
  const entries: GiftcodeEntry[] = [];
  for (const el of select(root, spec)) {
    const code = firstCodeToken(el.text);
    if (code) entries.push({ code, rewards: extractRewardNear(el.text, code) });
  }
  return dedupeByCode(entries);
}

/** One entry per `<li>` inside the matched container(s) (falls back to the container itself). */
export function extractFromListItems(
  root: HTMLElement,
  spec: SelectorSpec,
): GiftcodeEntry[] {
  const entries: GiftcodeEntry[] = [];
  for (const container of select(root, spec)) {
    const items = container.querySelectorAll('li');
    const targets = items.length > 0 ? items : [container];
    for (const item of targets) {
      const code = firstCodeToken(item.text);
      if (code) {
        entries.push({ code, rewards: extractRewardNear(item.text, code) });
      }
    }
  }
  return dedupeByCode(entries);
}

/** One entry per table row — code from the first `<td>`, reward from the second (if present). */
export function extractFromTables(
  root: HTMLElement,
  spec: SelectorSpec,
): GiftcodeEntry[] {
  const entries: GiftcodeEntry[] = [];
  for (const container of select(root, spec)) {
    const table =
      container.tagName === 'TABLE' ? container : container.querySelector('table');
    if (!table) continue;
    for (const row of table.querySelectorAll('tr')) {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) continue; // header row (th only)
      const code = firstCodeToken(cells[0].text);
      if (!code) continue;
      const rewards =
        cells.length > 1
          ? extractRewardNear(cells[1].text, '') || undefined
          : extractRewardNear(row.text, code);
      entries.push({ code, rewards });
    }
  }
  return dedupeByCode(entries);
}

/**
 * Each matched element IS (or directly contains) a code — use its own text.
 * These elements are usually just a bare `<code>`/span with no surrounding
 * reward context, so rewards are left undefined here (best to avoid
 * capturing a whole unrelated paragraph as "reward" text).
 */
export function extractSelfText(
  root: HTMLElement,
  spec: SelectorSpec,
): GiftcodeEntry[] {
  const entries: GiftcodeEntry[] = [];
  for (const el of select(root, spec)) {
    const trimmed = el.text.trim().toUpperCase();
    const code =
      /^[A-Z0-9]{4,24}$/.test(trimmed) ? trimmed : firstCodeToken(el.text);
    if (code) entries.push({ code });
  }
  return dedupeByCode(entries);
}
