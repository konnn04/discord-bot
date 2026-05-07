/**
 * In-memory rate limiter for stalker notifications.
 * Prevents DM spam: max 1 notification per subscription per mode every 5 minutes.
 */

type StalkMode = 'online' | 'voice' | 'game' | 'message';

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const cooldowns = new Map<string, number>();

/** Build key from subscription ID + mode */
function key(subId: string, mode: StalkMode): string {
  return `${subId}:${mode}`;
}

/** Returns true if the notification should be suppressed (too soon). */
export function isStalkRateLimited(subId: string, mode: StalkMode): boolean {
  const k = key(subId, mode);
  const last = cooldowns.get(k);
  if (last && Date.now() - last < COOLDOWN_MS) {
    return true;
  }
  cooldowns.set(k, Date.now());
  return false;
}
