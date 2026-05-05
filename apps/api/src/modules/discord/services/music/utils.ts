/**
 * Utility functions for the music system.
 */

/** Format seconds to mm:ss or hh:mm:ss */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const sStr = s.toString().padStart(2, '0');
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sStr}`;
  }
  return `${m}:${sStr}`;
}

/** Create a progress bar for now playing */
export function createProgressBar(
  elapsed: number,
  total: number,
  length = 15,
): string {
  if (total <= 0) return '▬'.repeat(length);
  const progress = Math.min(elapsed / total, 1);
  const filledLength = Math.round(progress * length);
  const bar =
    '▬'.repeat(Math.max(0, filledLength)) +
    '🔘' +
    '▬'.repeat(Math.max(0, length - filledLength - 1));
  return bar;
}

/** Truncate text to a max length */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

/** Detect if a string is a URL */
export function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str.trim());
}

/** Extract YouTube video ID from various URL formats */
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
