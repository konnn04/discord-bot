/**
 * Per-guild music queue manager.
 */
import type { MusicTrack } from './music-api.client';

export interface QueueTrack {
  track: MusicTrack;
  youtubeId?: string;
  requestedBy: string; // display name
  requestedById: string; // Discord user ID (for history tracking)
}

export interface GuildQueue {
  tracks: QueueTrack[];
  current: number;
  volume: number;
  textChannelId: string;
  loopMode: 'off' | 'track' | 'queue';
}

const PAGE_SIZE = 10;

let _guildSettings: any = null;
export function setQueueGuildSettings(settings: any): void {
  _guildSettings = settings;
}

class QueueManager {
  private queues = new Map<string, GuildQueue>();

  /** Get or create a queue for a guild */
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
    // Always update text channel to the latest one used
    q.textChannelId = textChannelId;
    return q;
  }

  /** Get the queue if it exists */
  get(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  /** Add a single track to the queue, returns its position */
  addTrack(guildId: string, textChannelId: string, item: QueueTrack): number {
    const q = this.getOrCreate(guildId, textChannelId);
    q.tracks.push(item);
    return q.tracks.length;
  }

  /** Add multiple tracks to the queue, returns count added */
  addTracks(
    guildId: string,
    textChannelId: string,
    items: QueueTrack[],
  ): number {
    const q = this.getOrCreate(guildId, textChannelId);
    q.tracks.push(...items);
    return items.length;
  }

  /** Get current track */
  getCurrent(guildId: string): QueueTrack | null {
    const q = this.queues.get(guildId);
    if (!q || q.current >= q.tracks.length) return null;
    return q.tracks[q.current];
  }

  /** Skip n tracks, returns the new current track or null if queue ended */
  skip(guildId: string, n = 1, isAuto = false): QueueTrack | null {
    const q = this.queues.get(guildId);
    if (!q) return null;

    if (q.loopMode === 'track' && isAuto) {
      // Loop track: don't advance current index if naturally ending
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

  /** Check if there is a next track */
  hasNext(guildId: string): boolean {
    const q = this.queues.get(guildId);
    if (!q) return false;
    if (q.loopMode === 'track') return true; // Always has next (itself)
    if (q.loopMode === 'queue' && q.tracks.length > 0) return true; // Always has next
    return q.current + 1 < q.tracks.length;
  }

  /** Go to previous track, returns the new current track or null */
  prev(guildId: string): QueueTrack | null {
    const q = this.queues.get(guildId);
    if (!q || q.current <= 0) return null;
    q.current--;
    return q.tracks[q.current];
  }

  /** Get remaining tracks count after current */
  remaining(guildId: string): number {
    const q = this.queues.get(guildId);
    if (!q) return 0;
    return Math.max(0, q.tracks.length - q.current - 1);
  }

  /**
   * Get a page of remaining tracks (after current), plus the current track.
   * Page 1 = tracks immediately after current.
   */
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

  /** Get queue page for display (10 tracks per page, all tracks) */
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

  /** Set volume for a guild */
  setVolume(guildId: string, vol: number): void {
    const q = this.queues.get(guildId);
    if (q) q.volume = Math.max(0, Math.min(100, vol));
  }

  /** Get volume for a guild */
  getVolume(guildId: string): number {
    return this.queues.get(guildId)?.volume ?? 80;
  }

  /** Set loop mode */
  setLoopMode(guildId: string, mode: 'off' | 'track' | 'queue'): void {
    const q = this.queues.get(guildId);
    if (q) q.loopMode = mode;
  }

  /** Shuffle remaining tracks in the queue */
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

  /** Remove a track at the given 1-based position (relative to current). Returns the removed track or null */
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

  /** Clear queue tracks but keep the entry */
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

  /** Get total duration of remaining tracks (seconds) */
  totalDuration(guildId: string): number {
    const q = this.queues.get(guildId);
    if (!q) return 0;
    return q.tracks.reduce((sum, t) => sum + (t.track.duration || 0), 0);
  }
}

/** Singleton */
let _instance: QueueManager | null = null;
export function getQueueManager(): QueueManager {
  if (!_instance) _instance = new QueueManager();
  return _instance;
}
