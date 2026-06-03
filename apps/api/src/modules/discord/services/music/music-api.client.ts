import type {
  MusicTrack,
  SearchAndResolveResult,
  ParseUrlResult,
  ResolveResult,
  StreamInfo,
  LyricsResult,
} from 'shared/src/types/music.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
}

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

  async searchAndResolve(query: string): Promise<SearchAndResolveResult> {
    const params = new URLSearchParams({ q: query });
    return this.request<SearchAndResolveResult>(
      `/music/search-and-resolve?${params}`,
    );
  }

  async parseUrl(
    url: string,
    type?: 'track' | 'playlist' | 'album',
  ): Promise<ParseUrlResult> {
    const params = new URLSearchParams({ url });
    if (type) params.set('type', type);
    return this.request<ParseUrlResult>(`/music/parse-url?${params}`);
  }

  async resolve(spotifyId: string): Promise<ResolveResult> {
    return this.request<ResolveResult>(`/music/resolve/${spotifyId}`);
  }

  async resolveMany(spotifyIds: string[]): Promise<Map<string, ResolveResult>> {
    const results = new Map<string, ResolveResult>();
    if (spotifyIds.length === 0) return results;

    const resolved = await Promise.all(
      spotifyIds.map((id) =>
        this.resolve(id).catch((err) => {
          console.warn(
            `[MusicApi] Failed to resolve Spotify track ${id}: ${String(err)}`,
          );
          return null as ResolveResult | null;
        }),
      ),
    );
    resolved.forEach((r, i) => {
      if (r) results.set(spotifyIds[i], r);
    });

    return results;
  }

  async getRecommendations(trackId: string): Promise<MusicTrack[]> {
    return this.request<MusicTrack[]>(`/music/recommendations/${trackId}`);
  }

  async getPlaylist(
    source: string,
    id: string,
  ): Promise<{ name?: string; tracks: MusicTrack[] }> {
    return this.request<{ name?: string; tracks: MusicTrack[] }>(
      `/music/playlists/${source}/${id}`,
    );
  }

  async getStreamInfo(videoId: string): Promise<StreamInfo> {
    return this.request<StreamInfo>(`/stream/${videoId}/info`);
  }

  getProxyStreamUrl(videoId: string, format?: string): string {
    let url = `${this.baseUrl}/stream/${videoId}`;
    if (format) url += `?format=${format}`;
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}apiKey=${encodeURIComponent(this.apiKey)}`;
    return url;
  }

  getStreamHeaders(): Record<string, string> {
    return { 'X-API-Key': this.apiKey };
  }

  async fetchPlayStream(trackUrl: string): Promise<Response> {
    const url = `${this.baseUrl}/stream/play`;
    return fetch(url, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trackUrl }),
    });
  }

  async getLyrics(track: string, artist: string): Promise<LyricsResult> {
    const params = new URLSearchParams({ track, artist });
    return this.request<LyricsResult>(`/lyrics?${params}`);
  }

  async searchLyrics(track: string, artist?: string): Promise<LyricsResult[]> {
    const params = new URLSearchParams({ track });
    if (artist) params.set('artist', artist);
    return this.request<LyricsResult[]>(`/lyrics/search?${params}`);
  }

  isConfigured(): boolean {
    return !!this.baseUrl && !!this.apiKey;
  }
}

let _instance: MusicApiClient | null = null;

export function getMusicApi(): MusicApiClient {
  if (!_instance) {
    _instance = new MusicApiClient();
  }
  return _instance;
}
