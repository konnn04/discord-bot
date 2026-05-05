/**
 * HTTP client for the Music Server API.
 * Reads MUSIC_SERVER_URL and MUSIC_SERVER_API_TOKEN from environment.
 */

// ============ Types ============

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

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
}

// ============ Client ============

export class MusicApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.MUSIC_SERVER_URL || '';
    this.apiKey = process.env.MUSIC_SERVER_API_TOKEN || '';
  }

  private get headers(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      Accept: 'application/json',
    };
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Music API error: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success) {
      throw new Error(
        (json as any).error || 'Music API returned success=false',
      );
    }
    return json.data;
  }

  private async requestPost<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, { method: 'POST', headers: this.headers });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.error || `Music API error: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success) {
      throw new Error(
        (json as any).error || 'Music API returned success=false',
      );
    }
    return json.data;
  }

  /**
   * Generates a secure, short-lived download URL that does NOT contain the API key.
   */
  async getPublicDownloadUrl(
    videoId: string,
    format?: string,
  ): Promise<string> {
    let url = `/stream/${videoId}/download-token`;
    if (format) url += `?format=${format}`;

    const { token } = await this.requestPost<{ token: string }>(url);
    return `${this.baseUrl}/public-stream/download/${token}`;
  }

  /** Search for tracks */
  async search(
    query: string,
    source: 'youtube' | 'spotify' | 'all' = 'all',
    limit = 10,
  ): Promise<MusicTrack[]> {
    const params = new URLSearchParams({
      q: query,
      source,
      limit: String(limit),
    });
    return this.request<MusicTrack[]>(`/music/search?${params}`);
  }

  /** Search and resolve to a streamable YouTube ID in one call */
  async searchAndResolve(query: string): Promise<SearchAndResolveResult> {
    const params = new URLSearchParams({ q: query });
    return this.request<SearchAndResolveResult>(
      `/music/search-and-resolve?${params}`,
    );
  }

  /** Parse a YouTube or Spotify URL */
  async parseUrl(
    url: string,
    type?: 'track' | 'playlist' | 'album',
  ): Promise<ParseUrlResult> {
    const params = new URLSearchParams({ url });
    if (type) params.set('type', type);
    return this.request<ParseUrlResult>(`/music/parse-url?${params}`);
  }

  /** Resolve a Spotify track to YouTube */
  async resolve(spotifyId: string): Promise<ResolveResult> {
    return this.request<ResolveResult>(`/music/resolve/${spotifyId}`);
  }

  /** Get recommendations based on a track */
  async getRecommendations(trackId: string): Promise<MusicTrack[]> {
    return this.request<MusicTrack[]>(`/music/recommendations/${trackId}`);
  }

  /** Get playlist info and tracks */
  async getPlaylist(
    source: string,
    id: string,
  ): Promise<{ name?: string; tracks: MusicTrack[] }> {
    return this.request<{ name?: string; tracks: MusicTrack[] }>(
      `/music/playlists/${source}/${id}`,
    );
  }

  /** Get stream info (available formats, metadata) */
  async getStreamInfo(videoId: string): Promise<StreamInfo> {
    return this.request<StreamInfo>(`/stream/${videoId}/info`);
  }

  /** Build the proxy stream URL (does NOT fetch, just builds the URL) */
  getProxyStreamUrl(videoId: string, format?: string): string {
    let url = `${this.baseUrl}/stream/${videoId}`;
    if (format) url += `?format=${format}`;
    // Append API key as query param for audio resource consumption
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}apiKey=${encodeURIComponent(this.apiKey)}`;
    return url;
  }

  /** Get the headers needed for streaming requests */
  getStreamHeaders(): Record<string, string> {
    return { 'X-API-Key': this.apiKey };
  }

  /** Get lyrics by track name and artist */
  async getLyrics(track: string, artist: string): Promise<LyricsResult> {
    const params = new URLSearchParams({ track, artist });
    return this.request<LyricsResult>(`/lyrics?${params}`);
  }

  /** Search lyrics (multiple results) */
  async searchLyrics(track: string, artist?: string): Promise<LyricsResult[]> {
    const params = new URLSearchParams({ track });
    if (artist) params.set('artist', artist);
    return this.request<LyricsResult[]>(`/lyrics/search?${params}`);
  }

  /** Check if the client is configured */
  isConfigured(): boolean {
    return !!this.baseUrl && !!this.apiKey;
  }
}

/** Singleton instance */
let _instance: MusicApiClient | null = null;

export function getMusicApi(): MusicApiClient {
  if (!_instance) {
    _instance = new MusicApiClient();
  }
  return _instance;
}
