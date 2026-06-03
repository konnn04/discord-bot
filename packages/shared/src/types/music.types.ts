/**
 * Music system type definitions — shared across monorepo.
 */

/** Raw track data from the music server API */
export interface MusicTrack {
  id: string; // e.g. "youtube:xTvyyoF_LZY" or "spotify:7qiZfU..."
  source: 'youtube' | 'spotify';
  sourceId: string; // raw ID on the platform
  title: string;
  artist: string;
  album?: string;
  duration: number; // seconds
  thumbnail: string;
  url: string;
}

export interface SearchAndResolveResult {
  track: MusicTrack;
  youtubeId: string;
}

export interface ParseUrlResult {
  type: 'track' | 'playlist' | 'album';
  data: MusicTrack | MusicTrack[] | { name?: string; tracks: MusicTrack[] };
}

export interface ResolveResult {
  spotify: MusicTrack;
  youtube: MusicTrack;
}

/** Audio stream metadata from the music server */
export interface StreamInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  audioFormats: AudioFormat[];
}

export interface AudioFormat {
  formatId: string;
  ext: string;
  quality: string;
  fileSize: number;
  abr: number;
  acodec: string;
}

export interface LyricsResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  plainLyrics: string;
  syncedLyrics?: string;
}

/** Track with requester info — lives in the per-guild queue */
export interface QueueTrack {
  track: MusicTrack;
  youtubeId?: string;
  requestedBy: string; // display name
  requestedById: string; // Discord user ID (for history tracking)
}

/** Per-guild music queue state */
export interface GuildQueue {
  tracks: QueueTrack[];
  current: number;
  volume: number;
  textChannelId: string;
  loopMode: 'off' | 'track' | 'queue';
}

/** WebSocket music state pushed to dashboard clients */
export interface MusicState {
  guildId: string;
  playerState: {
    isPlaying: boolean;
    isPaused: boolean;
    currentTrack: any;
    position: number;
    volume: number;
    loop: string;
    shuffle: boolean;
  } | null;
  queue: any[];
  history: any[];
  voiceChannelId: string | null;
  voiceChannelName: string | null;
}
