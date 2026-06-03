type StalkMode = 'online' | 'voice' | 'game' | 'message';

import { STALK_COOLDOWN_MS } from '../constants';

const cooldowns = new Map<string, number>();

function key(subId: string, mode: StalkMode): string {
  return `${subId}:${mode}`;
}

export function isStalkRateLimited(subId: string, mode: StalkMode): boolean {
  const k = key(subId, mode);
  const last = cooldowns.get(k);
  if (last && Date.now() - last < STALK_COOLDOWN_MS) {
    return true;
  }
  cooldowns.set(k, Date.now());
  return false;
}
