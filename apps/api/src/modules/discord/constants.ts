/**
 * Shared constants for the Discord module.
 */

// ── Pagination ──
export const PAGE_SIZE = 10;

// ── URLs ──
export const DISCORD_CDN = 'https://cdn.discordapp.com';
export const LEETCODE_BASE = 'https://leetcode.com';

/** Build the Dashboard URL from environment */
export function getDashboardUrl(): string {
  const raw =
    process.env.DASHBOARD_URL ||
    process.env.CUSTOM_DOMAIN ||
    'http://localhost:5173';
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return normalized.replace(/\/$/, '');
}

// ── LeetCode ──
export const DIFF_COLORS: Record<string, number> = {
  Easy: 0x00b8a3,
  Medium: 0xffc01e,
  Hard: 0xef4743,
};

export const DIFF_EMOJI: Record<string, string> = {
  All: '📊',
  Easy: '🟢',
  Medium: '🟠',
  Hard: '🔴',
};

// ── Anime ──
export const STATUS_EMOJI: Record<string, string> = {
  RELEASING: '📺',
  FINISHED: '✅',
  NOT_YET_RELEASED: '⏳',
  CANCELLED: '🚫',
};

// ── Confession ──
export const BANNED_WORDS = ['địt', 'cặc', 'lồn', 'chó', 'fuck', 'shit'];

// ── Rate limits & intervals ──
export const STALK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
export const VOICE_TAG_FLUSH_INTERVAL_MS = 2000;
export const ROLE_NAME_PREFIX = '📢 {} members';
