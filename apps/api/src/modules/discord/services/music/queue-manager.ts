/**
 * Per-guild music queue manager.
 */
import type { QueueTrack, GuildQueue } from 'shared/src/types/music.types';
import { PAGE_SIZE } from '../../constants';

let _guildSettings: any = null;
export function setQueueGuildSettings(settings: any): void {
  _guildSettings = settings;
}

class QueueManager {
  private queues = new Map<string, GuildQueue>();

  getOrCreate(guildId: string, textChannelId: string): GuildQueue {
    let q = this.queues.get(guildId);
    if (!q) {
      const defaultVol =
        _guildSettings?.get(guildId)?.music?.defaultVolume ?? 80;
      q = {
        tracks: [],
        current: 0,
        volume: defaultVol,
        textChannelId,
        loopMode: 'off',
      };
      this.queues.set(guildId, q);
    }
    q.textChannelId = textChannelId;
    return q;
  }

  get(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  addTrack(guildId: string, textChannelId: string, item: QueueTrack): number {
    const q = this.getOrCreate(guildId, textChannelId);
    q.tracks.push(item);
    return q.tracks.length;
  }

  addTracks(
    guildId: string,
    textChannelId: string,
    items: QueueTrack[],
  ): number {
    const q = this.getOrCreate(guildId, textChannelId);
    q.tracks.push(...items);
    return items.length;
  }

  getCurrent(guildId: string): QueueTrack | null {
    const q = this.queues.get(guildId);
    if (!q || q.current >= q.tracks.length) return null;
    return q.tracks[q.current];
  }

  skip(guildId: string, n = 1, isAuto = false): QueueTrack | null {
    const q = this.queues.get(guildId);
    if (!q) return null;

    if (q.loopMode === 'track' && isAuto) {
      return q.tracks[q.current];
    }

    q.current += n;
    if (q.current >= q.tracks.length) {
      if (q.loopMode === 'queue') {
        q.current = q.current % q.tracks.length;
      } else {
        return null;
      }
    }
    return q.tracks[q.current];
  }

  hasNext(guildId: string): boolean {
    const q = this.queues.get(guildId);
    if (!q) return false;
    if (q.loopMode === 'track') return true;
    if (q.loopMode === 'queue' && q.tracks.length > 0) return true;
    return q.current + 1 < q.tracks.length;
  }

  prev(guildId: string): QueueTrack | null {
    const q = this.queues.get(guildId);
    if (!q || q.current <= 0) return null;
    q.current--;
    return q.tracks[q.current];
  }

  remaining(guildId: string): number {
    const q = this.queues.get(guildId);
    if (!q) return 0;
    return Math.max(0, q.tracks.length - q.current - 1);
  }

  getRemainingPage(
    guildId: string,
    page = 1,
  ): {
    currentTrack: QueueTrack | null;
    tracks: QueueTrack[];
    page: number;
    totalPages: number;
    totalRemaining: number;
    totalRemainingDuration: number;
  } {
    const q = this.queues.get(guildId);
    if (!q || q.tracks.length === 0) {
      return {
        currentTrack: null,
        tracks: [],
        page: 1,
        totalPages: 0,
        totalRemaining: 0,
        totalRemainingDuration: 0,
      };
    }

    const currentTrack =
      q.current < q.tracks.length ? q.tracks[q.current] : null;
    const remaining = q.tracks.slice(q.current + 1);
    const totalRemaining = remaining.length;
    const totalRemainingDuration = remaining.reduce(
      (sum, t) => sum + (t.track.duration || 0),
      0,
    );

    if (totalRemaining === 0) {
      return {
        currentTrack,
        tracks: [],
        page: 1,
        totalPages: 0,
        totalRemaining: 0,
        totalRemainingDuration: 0,
      };
    }

    const totalPages = Math.ceil(totalRemaining / PAGE_SIZE);
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, totalRemaining);
    const tracks = remaining.slice(start, end);

    return {
      currentTrack,
      tracks,
      page: safePage,
      totalPages,
      totalRemaining,
      totalRemainingDuration,
    };
  }

  getPage(
    guildId: string,
    page = 1,
  ): {
    tracks: QueueTrack[];
    page: number;
    totalPages: number;
    total: number;
    currentIndex: number;
  } {
    const q = this.queues.get(guildId);
    if (!q || q.tracks.length === 0) {
      return { tracks: [], page: 1, totalPages: 0, total: 0, currentIndex: -1 };
    }

    const total = q.tracks.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    const tracks = q.tracks.slice(start, end);

    return {
      tracks,
      page: safePage,
      totalPages,
      total,
      currentIndex: q.current,
    };
  }

  setVolume(guildId: string, vol: number): void {
    const q = this.queues.get(guildId);
    if (q) q.volume = Math.max(0, Math.min(100, vol));
  }

  getVolume(guildId: string): number {
    return this.queues.get(guildId)?.volume ?? 80;
  }

  setLoopMode(guildId: string, mode: 'off' | 'track' | 'queue'): void {
    const q = this.queues.get(guildId);
    if (q) q.loopMode = mode;
  }

  shuffle(guildId: string): boolean {
    const q = this.queues.get(guildId);
    if (!q || q.current >= q.tracks.length - 1) return false; // Nothing to shuffle

    const remaining = q.tracks.slice(q.current + 1);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    q.tracks.splice(q.current + 1, remaining.length, ...remaining);
    return true;
  }

  removeTrack(guildId: string, position: number): QueueTrack | null {
    const q = this.queues.get(guildId);
    if (!q || position < 1) return null;

    const targetIndex = q.current + position;
    if (targetIndex >= q.tracks.length) return null;
    if (targetIndex === q.current) return null;

    const removed = q.tracks.splice(targetIndex, 1)[0];

    if (targetIndex < q.current) {
      q.current--;
    }

    return removed;
  }

  clear(guildId: string): void {
    const q = this.queues.get(guildId);
    if (q) {
      q.tracks = [];
      q.current = 0;
    }
  }

  /** Remove entire guild queue */
  remove(guildId: string): void {
    this.queues.delete(guildId);
  }

  totalDuration(guildId: string): number {
    const q = this.queues.get(guildId);
    if (!q) return 0;
    return q.tracks.reduce((sum, t) => sum + (t.track.duration || 0), 0);
  }
}

let _instance: QueueManager | null = null;
export function getQueueManager(): QueueManager {
  if (!_instance) _instance = new QueueManager();
  return _instance;
}
